import { fs, process, logger } from 'appium-support';
import { SubProcess } from 'teen_process';

const log = logger.getLogger('SafariDriverProc');

class SafariDriverProc {
  constructor ({port, unexpectedExitHandler}) {
    this.port = port;
    this.proc = null;
    this.unexpectedExitHandler = unexpectedExitHandler;
  }

  async start () {
    await process.killProcess('safaridriver');
    const safariBin = await fs.which('safaridriver');
    this.proc = new SubProcess(safariBin, ['-p', this.port]);

    this.proc.on('stream-line', log.debug.bind(log));
    this.proc.on('stop', this.onProcStop.bind(this));
    this.proc.on('die', this.onProcDie.bind(this));

    log.info('Starting safaridriver');
    await this.proc.start(0);
  }

  onProcStop (code, signal) {
    log.info(`Safaridriver exited cleanly with code ${code} and signal ${signal}`);
  }

  onProcDie (code, signal) {
    const errMsg = `Safaridriver exited unexpectedly with code ${code} ` +
                   `and signal ${signal}`;
    log.error(errMsg);
    if (this.unexpectedExitHandler) {
      this.unexpectedExitHandler(new Error(errMsg));
    }
  }

  async stop () {
    if (!this.proc) {
      log.warn("Can't stop safaridriver; no active proc");
      return;
    }

    log.info('Stopping safaridriver');
    try {
      await this.proc.stop('SIGTERM', 20000);
    } catch (ign) {}
    this.proc = null;
  }
}

export default SafariDriverProc;
