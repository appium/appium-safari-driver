import { remote } from 'webdriverio';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';

chai.should();
chai.use(chaiAsPromised);


const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
  'appium:automationName': 'safari',
};

describe('Desktop SafariDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let driver;
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
    await driver.url('https://appium.io/');
    const input = await driver.$('input[data-md-component="header"]');
    (await input.isExisting()).should.be.true;
  });
});


