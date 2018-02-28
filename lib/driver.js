import { BaseDriver, JWProxy } from 'appium-base-driver';
import log from './logger';
import { retryInterval } from 'asyncbox';
import SafariDriverProc from './safari';

const SD_PORT = 4912;

class SafariDriver extends BaseDriver {

  constructor (opts = {}) {
    super(opts, false);
    this.initState();
  }

  initState () {
    this.safari = null;
    this.proxy = null;
    this.proxyReqRes = null;
    this.isProxyActive = false;
  }

  proxyActive () {
    return this.isProxyActive;
  }

  getProxyAvoidList () {
    return [];
  }

  canProxy () {
    return true;
  }

  async createSession (...args) {
    let [sessionId, caps] = await super.createSession(...args);
    try {
      this.safari = new SafariDriverProc({
        port: SD_PORT,
        unexpectedExitHandler: this.startUnexpectedShutdown.bind(this)
      });
      await this.safari.start();

      const proxyOpts = {
        server: "localhost",
        port: SD_PORT,
        base: "",
        timeout: 300000,
      };
      this.proxy = new JWProxy(proxyOpts);

      await retryInterval(5, 1000, async () => {
        await this.proxy.command("/session", "POST", {desiredCapabilities: caps});
      });
      this.proxyReqRes = this.proxy.proxyReqRes.bind(this.proxy);
      this.isProxyActive = true;
      return [sessionId, caps];
    } catch (e) {
      await this.deleteSession();
      throw e;
    }
  }

  async deleteSession () {
    log.info("Ending Safari session");
    await super.deleteSession();
    await this.safari.stop();
    this.initState();
  }
}

export default SafariDriver;
