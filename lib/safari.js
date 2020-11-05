import _ from 'lodash';
import { JWProxy, errors } from 'appium-base-driver';
import { fs, logger, util } from 'appium-support';
import { SubProcess } from 'teen_process';
import { waitForCondition } from 'asyncbox';
import { findAPortNotInUse } from 'portscanner';

const log = logger.getLogger('SafariDriverServer');

const SD_BINARY = 'safaridriver';
const STARTUP_TIMEOUT = 10000; // seconds
const SAFARI_PORT_RANGE = [4900, 5000];
// This guard is needed to make sure
// we never run two safari driver processes for the same Appium process
const SAFARI_PORT_ALLOCATION_GUARD = util.getLockFileGuard(
  path.resolve(os.tmpdir(), 'safari_port_guard'),
  {timeout: 5, tryRecovery: true}
);


class SafariProxy extends JWProxy {
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
    this.port = null;
    this.proc = null;
  }

  get isRunning () {
    return !!(this.proc?.isRunning);
  }

  async init () {
    await SAFARI_PORT_ALLOCATION_GUARD(async () => {
      if (this.isRunning) {
        return;
      }

      const [startPort, endPort] = SAFARI_PORT_RANGE;
      try {
        this.port = await findAPortNotInUse(startPort, endPort);
      } catch (e) {
        throw new Error(
          `Cannot find any free port in range ${startPort}..${endPort}}. ` +
          `Double check the processes that are locking ports within this range and terminate ` +
          `these which are not needed anymore`);
      }

      let safariBin;
      try {
        safariBin = await fs.which(SD_BINARY);
      } catch (e) {
        throw new Error(`${SD_BINARY} binary cannot be found in PATH. ` +
          `Please make sure it is present on your system`);
      }
      this.proc = new SubProcess(safariBin, ['-p', this.port, '--diagnose']);
      this.proc.on('output', (stdout, stderr) => {
        const line = stdout || stderr;
        log.debug(`[${SD_BINARY}] ${line}`);
      });
      this.proc.on('exit', (code, signal) => {
        log.info(`${SD_BINARY} has exited with code ${code}, signal ${signal}`);
      });
      log.info(`Starting ${SD_BINARY} on port ${this.port}`);
      await this.proc.start(0);
    });
  }
}

// Single server process per Appium instance
// It is terminated automatically after Appium exits
const SAFARI_DRIVER_PROCESS = new SafariDriverProcess();

class SafariDriverServer {
  constructor () {
    this.proxy = null;
  }

  get isRunning () {
    return !!(SAFARI_DRIVER_PROCESS.isRunning);
  }

  async start (caps) {
    await SAFARI_DRIVER_PROCESS.init();

    this.proxy = SafariProxy({
      server: '127.0.0.1',
      port: SAFARI_DRIVER_PROCESS.port,
      base: '',
      keepAlive: true,
    });
    this.proxy.didProcessExit = false;
    SAFARI_DRIVER_PROCESS.proc.on('exit', () => {
      this.proxy.didProcessExit = true;
    })

    try {
      await waitForCondition(async () => {
        try {
          await this.proxy.command('/status', 'GET');
          return true;
        } catch (err) {
          if (this.proxy.didProcessExit) {
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
      log.info(`${SD_BINARY} session cannot be stopped, because the server is not running`);
      return;
    }

    try {
      await this.proxy.command(`/session/${this.proxy.sessionId}`, 'DELETE');
    } catch (e) {
      log.info(`${SD_BINARY} session cannot be stopped. Original error: ${e.message}`);
    }
  }
}

export default SafariDriverServer;
