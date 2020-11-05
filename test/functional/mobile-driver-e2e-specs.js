import wd from 'wd';
import { startServer } from '../..';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';

chai.should();
chai.use(chaiAsPromised);

const HOST = '127.0.0.1';
const PORT = 4567;
const MOCHA_TIMEOUT = 240000;
const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '14.1';
const DEVICE_NAME = process.env.DEVICE_NAME || 'iPhone 11 Pro Max';
const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'ios',
  'safari:useSimulator': true,
  'safari:platformVersion': PLATFORM_VERSION,
  'safari:deviceName': DEVICE_NAME,
};

describe('Mobile SafariDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let server;
  let driver;
  before(async function () {
    if (process.env.DEVICE_NAME) {
      // In Azure CI the stuff fails with
      // "The device is not configured to allow remote control via WebDriver. To fix this, toggle 'Allow Remote Automation' in Safari's settings (Settings App > Safari > Advanced)."
      // error
      return this.skip();
    }

    server = await startServer(PORT, HOST);
  });
  after(async function () {
    if (server) {
      await server.close();
      server = null;
    }
  });
  beforeEach(async function () {
    driver = wd.promiseChainRemote(HOST, PORT);
    await driver.init(CAPS);
  });
  afterEach(async function () {
    if (driver) {
      await driver.quit();
      driver = null;
    }
  });

  it('should start and stop a session', async function () {
    await driver.get('https://appium.io/');
    const button = await driver.elementByCss('#downloadLink');
    await button.text().should.eventually.eql('Download Appium');
  });
});


