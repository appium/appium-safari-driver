import { remote } from 'webdriverio';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';


const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
  'appium:automationName': 'safari',
};

describe('Desktop SafariDriver', function () {
  this.timeout(MOCHA_TIMEOUT);
  let chai;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    chai.should();
    chai.use(chaiAsPromised.default);
  });

  /** @type {import('webdriverio').Browser} */
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
    (await driver.getPageSource()).should.not.be.empty;
  });
});


