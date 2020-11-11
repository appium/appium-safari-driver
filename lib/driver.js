import _ from 'lodash';
import { BaseDriver } from 'appium-base-driver';
import log from './logger';
import SafariDriverServer from './safari';
import { desiredCapConstraints } from './desired-caps';
import commands from './commands/index';
import { formatCapsForServer } from './utils';

const NO_PROXY = [
  ['GET', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/element/[^/]+/elements?$')],
  ['POST', new RegExp('^/session/[^/]+/elements?$')],
];

class SafariDriver extends BaseDriver {
  constructor (opts = {}) {
    super(opts);
    this.desiredCapConstraints = desiredCapConstraints;
    this.locatorStrategies = [
      'xpath',
      'tag name',
      'link text',
      'partial link text',
      'css selector',
      // Let these two reach Safari Driver and fail there with a proper error message
      'id',
      'name',
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
    this._screenRecorder = null;
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
    this.safari = new SafariDriverServer();
    try {
      await this.safari.start(formatCapsForServer(caps));
    } catch (e) {
      await this.deleteSession();
      throw e;
    }
    this.proxyReqRes = this.safari.proxy.proxyReqRes.bind(this.safari.proxy);
    this.isProxyActive = true;
    return [sessionId, caps];
  }

  async deleteSession () {
    log.info('Ending Safari session');
    await this._screenRecorder?.stop(true);
    await this.safari?.stop();
    this.resetState();

    await super.deleteSession();
  }
}

export default SafariDriver;
