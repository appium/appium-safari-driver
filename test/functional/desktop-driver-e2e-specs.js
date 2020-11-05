import wd from 'wd';
import { startServer } from '../..';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';

chai.should();
chai.use(chaiAsPromised);

const HOST = '127.0.0.1';
const PORT = 4567;
const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
  targetPlatform: 'mac',
};

describe('Desktop SafariDriver', function () {
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
    const button = await driver.elementById('downloadLink');
    await button.text().should.eventually.eql('Download Appium');
  });
});


