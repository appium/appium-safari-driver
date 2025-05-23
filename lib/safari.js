import os from 'os';
import path from 'path';
import { JWProxy, errors } from 'appium/driver';
import { fs, logger, util } from 'appium/support';
import { SubProcess } from 'teen_process';
import { waitForCondition } from 'asyncbox';
import { findAPortNotInUse } from 'portscanner';
import { execSync } from 'child_process';

const SD_BINARY = 'safaridriver';
const STARTUP_TIMEOUT = 10000; // seconds
const SAFARI_PORT_RANGE = [5100, 5200];
// This guard is needed to make sure
// we never run multiple Safari driver processes for the same Appium process
const SAFARI_SERVER_GUARD = util.getLockFileGuard(
  path.resolve(os.tmpdir(), 'safari_server_guard.lock'),
  {timeout: 5, tryRecovery: true}
);


class SafariProxy extends JWProxy {
  /** @type {boolean|undefined} */
  didProcessExit;

  async proxyCommand (url, method, body = null) {
    if (this.didProcessExit) {
      throw new errors.InvalidContextError(
        `'${method} ${url}' cannot be proxied to Safari Driver server because ` +
        'the process is not running (probably crashed). Check the server log for more details');
    }
    return await super.proxyCommand(url, method, body);
  }
}

class SafariDriverProcess {
  constructor () {
    this.log = logger.getLogger('SafariDriverProcess');
    this.port = null;
    this.proc = null;
  }

  get isRunning () {
    return !!(this.proc?.isRunning);
  }

  async init () {
    await SAFARI_SERVER_GUARD(async () => {
      if (this.isRunning) {
        return;
      }

      const [startPort, endPort] = SAFARI_PORT_RANGE;
      try {
        this.port = await findAPortNotInUse(startPort, endPort);
      } catch {
        throw new Error(
          `Cannot find any free port in range ${startPort}..${endPort}. ` +
          `Double check the processes that are locking ports within this range and terminate ` +
          `these which are not needed anymore`);
      }

      let safariBin;
      try {
        safariBin = await fs.which(SD_BINARY);
      } catch {
        throw new Error(`${SD_BINARY} binary cannot be found in PATH. ` +
          `Please make sure it is present on your system`);
      }
      this.proc = new SubProcess(safariBin, ['-p', this.port, '--diagnose']);
      this.proc.on('output', (stdout, stderr) => {
        const line = stdout || stderr;
        this.log.debug(`[${SD_BINARY}] ${line}`);
      });
      this.proc.on('exit', (code, signal) => {
        this.log.info(`${SD_BINARY} has exited with code ${code}, signal ${signal}`);
      });
      this.log.info(`Starting '${safariBin}' on port ${this.port}`);
      await this.proc.start(0);
    });
  }

  async kill () {
    if (this.isRunning) {
      try {
        await this.proc?.stop('SIGKILL');
      } catch {}
    }
  }
}

// Single server process per Appium instance
const SAFARI_DRIVER_PROCESS = new SafariDriverProcess();
process.once('exit', () => {
  if (SAFARI_DRIVER_PROCESS.isRunning) {
    try {
      execSync(`kill ${SAFARI_DRIVER_PROCESS.proc?.pid}`);
    } catch {}
  }
});

export class SafariDriverServer {
  /** @type {SafariProxy} */
  proxy;

  /**
   * @param {import('@appium/types').AppiumLogger} log
   */
  constructor (log) {
    this.log = log;
    // @ts-ignore That's ok
    this.proxy = null;
  }

  get isRunning () {
    return !!(SAFARI_DRIVER_PROCESS.isRunning);
  }

  /**
   *
   * @param {import('@appium/types').StringRecord} caps
   * @param {SessionOptions} [opts={}]
   */
  async start (caps, opts = {}) {
    await SAFARI_DRIVER_PROCESS.init();

    const proxyOptions = {
      server: '127.0.0.1',
      port: SAFARI_DRIVER_PROCESS.port,
      base: '',
      log: this.log,
      keepAlive: true,
    };
    if (opts.reqBasePath) {
      proxyOptions.reqBasePath = opts.reqBasePath;
    }
    this.proxy = new SafariProxy(proxyOptions);
    this.proxy.didProcessExit = false;
    SAFARI_DRIVER_PROCESS.proc?.on('exit', () => {
      if (this.proxy) {
        this.proxy.didProcessExit = true;
      }
    });

    try {
      await waitForCondition(async () => {
        try {
          await this.proxy?.command('/status', 'GET');
          return true;
        } catch (err) {
          if (this.proxy?.didProcessExit) {
            throw new Error(err.message);
          }
          return false;
        }
      }, {
        waitMs: STARTUP_TIMEOUT,
        intervalMs: 1000,
      });
    } catch (e) {
      if (/Condition unmet/.test(e.message)) {
        if (SAFARI_DRIVER_PROCESS.isRunning) {
          // avoid "frozen" processes,
          await SAFARI_DRIVER_PROCESS.kill();
        }
        throw new Error(`Safari Driver server is not listening within ${STARTUP_TIMEOUT}ms timeout. ` +
          `Make sure it has been executed manually at least once with '--enable' command line argument. ` +
          `Check the server log for more details`);
      }
      throw e;
    }

    await this.proxy.command('/session', 'POST', {
      capabilities: {
        firstMatch: [{}],
        alwaysMatch: caps,
      }
    });
  }

  async stop () {
    if (!this.isRunning) {
      this.log.info(`${SD_BINARY} session cannot be stopped, because the server is not running`);
      return;
    }

    if (this.proxy?.sessionId) {
      try {
        await this.proxy.command(`/session/${this.proxy.sessionId}`, 'DELETE');
      } catch (e) {
        this.log.info(`${SD_BINARY} session cannot be deleted. Original error: ${e.message}`);
      }
    }
  }
}

export default SafariDriverServer;

/**
 * @typedef {Object} SessionOptions
 * @property {string} [reqBasePath]
 */
