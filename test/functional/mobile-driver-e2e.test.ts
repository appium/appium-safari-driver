import assert from 'node:assert/strict';
import {describe, it, before, beforeEach, afterEach} from 'node:test';

import {remote} from 'webdriverio';
import type {Browser} from 'webdriverio';

import {HOST, PORT, TEST_TIMEOUT, resolveSimulatorTarget, type SimulatorTarget} from '../utils.js';

describe('Mobile SafariDriver', {timeout: TEST_TIMEOUT}, () => {
  let driver: Browser | null = null;
  let simulator: SimulatorTarget;
  let caps: Record<string, string | boolean>;

  before(async () => {
    simulator = await resolveSimulatorTarget();

    caps = {
      browserName: 'AppiumSafari',
      platformName: 'iOS',
      'appium:automationName': 'safari',
      'safari:useSimulator': true,
      'safari:platformVersion': simulator.platformVersion,
      'safari:deviceName': simulator.deviceName,
      'safari:deviceUDID': simulator.udid,
      'wdio:enforceWebDriverClassic': true,
    };

    // Preboot Simulator to avoid unexpected timeouts
    if (simulator.state !== 'Booted') {
      await simulator.simctl.bootDevice();
      await simulator.simctl.startBootMonitor();
    }
  });
  beforeEach(async () => {
    driver = await remote({
      hostname: HOST,
      port: PORT,
      capabilities: caps,
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
