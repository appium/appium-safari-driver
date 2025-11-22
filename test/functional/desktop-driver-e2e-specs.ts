import { remote } from 'webdriverio';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';
import type { Browser } from 'webdriverio';
import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised.default);

const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
  'appium:automationName': 'safari',
  'wdio:enforceWebDriverClassic': true,
};

describe('Desktop SafariDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let driver: Browser | null = null;

  beforeEach(async function () {
    driver = await remote({
      hostname: HOST,
      port: PORT,
      capabilities: CAPS,
    });
  });
  afterEach(async function () {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
  });

  it('should start and stop a session', async function () {
    await driver!.url('https://appium.io/');
    expect(await driver!.getPageSource()).to.not.be.empty;
  });
});

