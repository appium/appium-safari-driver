import _ from 'lodash';
import { BaseDriver } from 'appium-base-driver';
import log from './logger';
import SafariDriverServer from './safari';
import { desiredCapConstraints } from './desired-caps';
import commands from './commands/index';

const NO_PROXY = [
  ['GET', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/element/[^/]+/elements?$')],
  ['POST', new RegExp('^/session/[^/]+/elements?$')],
];

class SafariDriver extends BaseDriver {

  constructor (opts = {}) {
    super(opts, false);
    this.desiredCapConstraints = desiredCapConstraints;
    this.locatorStrategies = [
      'xpath',
      'id',
      'name',
      'css',
      'class name',
    ];
    this.resetState();

    for (const [cmd, fn] of _.toPairs(commands)) {
      SafariDriver.prototype[cmd] = fn;
    }
  }

  resetState () {
    this.safari = null;
    this.proxyReqRes = null;
    this.isProxyActive = false;
  }

  proxyActive () {
    return this.isProxyActive;
  }

  getProxyAvoidList () {
    return NO_PROXY;
  }

  canProxy () {
    return true;
  }

  async createSession (...args) {
    const [sessionId, caps] = await super.createSession(...args);
    try {
      this.safari = new SafariDriverServer();
      await this.safari.start();
      this.proxyReqRes = this.safari.proxy.proxyReqRes.bind(this.safari.proxy);
      this.isProxyActive = true;
      return [sessionId, caps];
    } catch (e) {
      await this.safari.stop();
      throw e;
    }
  }

  async deleteSession () {
    log.info('Ending Safari session');
    await this.safari.stop();
    await super.deleteSession();
    this.resetState();
  }
}

export default SafariDriver;
