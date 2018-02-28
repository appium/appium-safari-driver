import { fs, logger } from 'appium-support';
import { SubProcess } from 'teen_process';

const DEFAULT_PORT = 4912;

const log = logger.getLogger('SafariDriver');

class SafariDriverProc {
  constructor () {
    this.proc = null;
    this.unexpectedExitHandler = null;
    this.expectingExit = false;
  }

  async start () {
    const safariBin = await fs.which('safaridriver');
    const args = ["-p", DEFAULT_PORT];
    let processIsAlive = false;
    try {
      this.proc = new SubProcess(safariBin, args);
      processIsAlive = true;
      this.proc.on('output', (stdout, stderr) => {
        for (let [name, stream] of [['STDOUT', stdout], ['STDERR', stderr]]) {
          for (let line of (stream || '').trim().split('\n').filter(Boolean)) {
            log.debug(`[${name}] ${line}`);
          }
        }
      });

      this.proc.on('exit', (code, signal) => {
        processIsAlive = false;
        if (!this.expectingExit) {
          const errMsg = `Safaridriver exited unexpectedly with code ${code} ` +
                         `and signal ${signal}`;
          log.error(errMsg);
          if (this.unexpectedExitHandler) {
            this.unexpectedExitHandler(new Error(errMsg));
          }
        } else {
          log.info(`Safaridriver exited with code ${code} and signal ${signal}`);
        }
        this.proc = null;
      });

      log.info("Starting safaridriver");
      await this.proc.start(0);
    } catch (e) {
      if (processIsAlive) {
        await this.stop();
      }
      throw e;
    }
  }

  onUnexpectedExit (handler) {
    this.unexpectedExitHandler = handler;
  }

  async stop () {
    if (!this.proc) {
      log.warn("Can't stop safaridriver; no process handle anymore");
      return;
    }

    log.info("Stopping safaridriver");
    this.expectingExit = true;
    await this.proc.stop('SIGTERM', 20000);
    this.proc = null;
    this.expectingExit = false;
  }
}

export default SafariDriverProc;
export { DEFAULT_PORT };
