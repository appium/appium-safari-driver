import { remote } from 'webdriverio';
import { startServer } from '../..';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';

chai.should();
chai.use(chaiAsPromised);


const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
};

describe('Desktop SafariDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let server;
  let driver;
  before(async function () {
    server = await startServer(PORT, HOST);
  });
  after(async function () {
    if (server) {
      await server.close();
      server = null;
    }
  });
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
    const button = await driver.findElement('css', '#downloadLink');
    await driver.getElementText(button).should.eventually.eql('Download Appium');
  });
});


