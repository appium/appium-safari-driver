import wd from 'wd';
import { startServer } from '../..';
import chai from 'chai';
chai.should();

const HOST = "127.0.0.1";
const PORT = 4567;
const CAPS = {
  browserName: "safari",
};

describe('SafariDriver', function () {
  let server;
  before(async function () {
    server = await startServer(PORT, HOST);
  });
  after(async function () {
    await server.close();
  });
  it('should start and stop a session', async function () {
    let driver = wd.promiseChainRemote(HOST, PORT);
    await driver.init(CAPS);
    try {
      await driver.get("https://appiumpro.com/contact");
      await driver.elementById('contactEmail').sendKeys("jlipps@cloudgrey.io");
      await driver.elementById('contactText').sendKeys("helloooo saucecon!");
      await driver.elementByCss('input[type="submit"]').click();
      let res = await driver.waitForElementByCss('.contactResponse', 10000, 500).text();
      res.should.include("Captcha");
    } finally {
      await driver.quit();
    }
  });
});


