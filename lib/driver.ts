import type {
  RouteMatcher,
  DefaultCreateSessionResult,
  DriverData,
  InitialOpts,
  StringRecord,
  ExternalDriver,
  W3CDriverCaps,
} from '@appium/types';
import { BaseDriver } from 'appium/driver';
import { SafariDriverServer } from './safari';
import { desiredCapConstraints, type SafariConstraints } from './desired-caps';
import * as cookieCommands from './commands/cookies';
import * as findCommands from './commands/find';
import * as recordScreenCommands from './commands/record-screen';
import { formatCapsForServer } from './utils';
import { newMethodMap } from './method-map';

const NO_PROXY: RouteMatcher[] = [
  ['GET', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/element/[^/]+/elements?$')],
  ['POST', new RegExp('^/session/[^/]+/elements?$')],

  ['DELETE', new RegExp('^/session/[^/]+/cookie$')],
];

export class SafariDriver
  extends BaseDriver<SafariConstraints, StringRecord>
  implements ExternalDriver<SafariConstraints, string, StringRecord>
{
  private isProxyActive: boolean;
  private _safari: SafariDriverServer | null;
  proxyReqRes: ((...args: any[]) => any) | null;
  _screenRecorder: recordScreenCommands.ScreenRecorder | null;

  static newMethodMap = newMethodMap;

  constructor (opts: InitialOpts = {} as InitialOpts) {
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
  }

  get safari (): SafariDriverServer {
    if (!this._safari) {
      throw new Error('Safari driver server is not initialized');
    }
    return this._safari;
  }

  override proxyActive (): boolean {
    return this.isProxyActive;
  }

  override getProxyAvoidList (): RouteMatcher[] {
    return NO_PROXY;
  }

  override canProxy (): boolean {
    return true;
  }

  override async createSession (
    w3cCaps1: W3CSafariDriverCaps,
    w3cCaps2?: W3CSafariDriverCaps,
    w3cCaps3?: W3CSafariDriverCaps,
    driverData?: DriverData[]
  ): Promise<DefaultCreateSessionResult<SafariConstraints>> {
    const [sessionId, caps] = await super.createSession(w3cCaps1, w3cCaps2, w3cCaps3, driverData);
    this._safari = new SafariDriverServer(this.log);
    try {
      await this.safari.start(formatCapsForServer(caps), {
        reqBasePath: this.basePath,
      });
    } catch (e) {
      await this.deleteSession();
      throw e;
    }
    this.proxyReqRes = this.safari.proxy.proxyReqRes.bind(this.safari.proxy);
    this.isProxyActive = true;
    return [sessionId, caps];
  }

  override async deleteSession (): Promise<void> {
    this.log.info('Ending Safari session');
    await this._screenRecorder?.stop(true);
    await this._safari?.stop();
    this.resetState();

    await super.deleteSession();
  }

  private resetState (): void {
    this._safari = null;
    this.proxyReqRes = null;
    this.isProxyActive = false;
    this._screenRecorder = null;
  }

  deleteCookies = cookieCommands.deleteCookies;

  findElOrEls = findCommands.findElOrEls;

  startRecordingScreen = recordScreenCommands.startRecordingScreen;
  stopRecordingScreen = recordScreenCommands.stopRecordingScreen;
}

export default SafariDriver;

type W3CSafariDriverCaps = W3CDriverCaps<SafariConstraints>;

