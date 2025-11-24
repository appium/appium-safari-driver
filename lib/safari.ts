import os from 'os';
import path from 'path';
import { JWProxy, errors } from 'appium/driver';
import { fs, logger, util } from 'appium/support';
import { SubProcess } from 'teen_process';
import { waitForCondition } from 'asyncbox';
import { findAPortNotInUse } from 'portscanner';
import { execSync } from 'child_process';
import type {
  AppiumLogger,
  StringRecord,
  HTTPMethod,
  HTTPBody,
} from '@appium/types';

const SD_BINARY = 'safaridriver';
const STARTUP_TIMEOUT = 10000; // seconds
const SAFARI_PORT_RANGE: [number, number] = [5100, 5200];
// This guard is needed to make sure
// we never run multiple Safari driver processes for the same Appium process
const SAFARI_SERVER_GUARD = util.getLockFileGuard(
  path.resolve(os.tmpdir(), 'safari_server_guard.lock'),
  {timeout: 5, tryRecovery: true}
);


class SafariProxy extends JWProxy {
  didProcessExit?: boolean;

  override async proxyCommand (url: string, method: HTTPMethod, body: HTTPBody = null) {
    if (this.didProcessExit) {
      throw new errors.InvalidContextError(
        `'${method} ${url}' cannot be proxied to Safari Driver server because ` +
        'the process is not running (probably crashed). Check the server log for more details');
    }
    return await super.proxyCommand(url, method, body);
  }
}

class SafariDriverProcess {
  private readonly log: AppiumLogger;
  public port: number | null = null;
  public proc: SubProcess | null = null;

  constructor () {
    this.log = logger.getLogger('SafariDriverProcess');
  }

  get isRunning (): boolean {
    return !!(this.proc?.isRunning);
  }

  async init (): Promise<void> {
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

      let safariBin: string;
      try {
        safariBin = await fs.which(SD_BINARY);
      } catch {
        throw new Error(`${SD_BINARY} binary cannot be found in PATH. ` +
          `Please make sure it is present on your system`);
      }
      this.proc = new SubProcess(safariBin, ['-p', String(this.port), '--diagnose']);
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

  async kill (): Promise<void> {
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

export interface SessionOptions {
  reqBasePath?: string;
}

export class SafariDriverServer {
  private _proxy: SafariProxy | null = null;
  private readonly log: AppiumLogger;

  constructor (log: AppiumLogger) {
    this.log = log;
  }

  get proxy (): SafariProxy {
    if (!this._proxy) {
      throw new Error('Safari driver proxy is not initialized');
    }
    return this._proxy;
  }

  get isRunning (): boolean {
    return !!(SAFARI_DRIVER_PROCESS.isRunning);
  }

  async start (caps: StringRecord, opts: SessionOptions = {}): Promise<void> {
    await SAFARI_DRIVER_PROCESS.init();

    const proxyOptions: any = {
      server: '127.0.0.1',
      port: SAFARI_DRIVER_PROCESS.port,
      base: '',
      log: this.log,
      keepAlive: true,
    };
    if (opts.reqBasePath) {
      proxyOptions.reqBasePath = opts.reqBasePath;
    }
    this._proxy = new SafariProxy(proxyOptions);
    this._proxy.didProcessExit = false;
    SAFARI_DRIVER_PROCESS.proc?.on('exit', () => {
      if (this._proxy) {
        this._proxy.didProcessExit = true;
      }
    });

    try {
      await waitForCondition(async () => {
        try {
          await this.proxy.command('/status', 'GET');
          return true;
        } catch (err: any) {
          if (this.proxy.didProcessExit) {
            throw new Error(err.message);
          }
          return false;
        }
      }, {
        waitMs: STARTUP_TIMEOUT,
        intervalMs: 1000,
      });
    } catch (e: any) {
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

  async stop (): Promise<void> {
    if (!this.isRunning) {
      this.log.info(`${SD_BINARY} session cannot be stopped, because the server is not running`);
      return;
    }

    if (this._proxy?.sessionId) {
      try {
        await this.proxy.command(`/session/${this.proxy.sessionId}`, 'DELETE');
      } catch (e: any) {
        this.log.info(`${SD_BINARY} session cannot be deleted. Original error: ${e.message}`);
      }
    }
  }
}

export default SafariDriverServer;

