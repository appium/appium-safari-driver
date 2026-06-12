import {describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {remote} from 'webdriverio';
import {HOST, PORT, TEST_TIMEOUT} from '../utils.js';
import type {Browser} from 'webdriverio';

const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'mac',
  'appium:automationName': 'safari',
  'wdio:enforceWebDriverClassic': true,
};

describe('Desktop SafariDriver', {timeout: TEST_TIMEOUT}, () => {
  let driver: Browser | null = null;

  beforeEach(async () => {
    driver = await remote({
      hostname: HOST,
      port: PORT,
      capabilities: CAPS,
    });
  });
  afterEach(async () => {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
  });

  it('should start and stop a session', async () => {
    await driver!.url('https://appium.io/');
    assert.ok(await driver!.getPageSource());
  });
});
