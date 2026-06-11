import {describe, it, before, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {remote} from 'webdriverio';
import {Simctl} from 'node-simctl';
import {HOST, PORT, TEST_TIMEOUT} from '../utils.js';
import type {Browser} from 'webdriverio';

const PLATFORM_VERSION = process.env.PLATFORM_VERSION || '14.1';
const DEVICE_NAME = process.env.DEVICE_NAME || 'iPhone 11 Pro Max';
const CAPS = {
  browserName: 'AppiumSafari',
  platformName: 'ios',
  'appium:automationName': 'safari',
  'safari:useSimulator': true,
  'safari:platformVersion': PLATFORM_VERSION,
  'safari:deviceName': DEVICE_NAME,
  'wdio:enforceWebDriverClassic': true,
};

const describeMobile = process.env.CI ? describe.skip : describe;

describeMobile('Mobile SafariDriver', {timeout: TEST_TIMEOUT}, () => {
  let driver: Browser | null = null;

  before(async () => {
    // Preboot Simulator to avoid unexpected timeouts
    const simctl = new Simctl();
    const allDevices = await simctl.getDevices(PLATFORM_VERSION, 'iOS');
    const device = allDevices.find(({name}) => name === DEVICE_NAME);
    if (!device) {
      throw new Error(`Cannot find '${DEVICE_NAME}' Simulator (${PLATFORM_VERSION})`);
    }
    if (device.state !== 'Booted') {
      simctl.udid = device.udid;
      await simctl.bootDevice();
      await simctl.startBootMonitor();
    }
  });
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
