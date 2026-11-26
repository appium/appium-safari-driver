import assert from 'node:assert/strict';
import {afterEach, describe, it, mock} from 'node:test';

import {SafariDriver} from '../../lib/driver.js';
import {SafariDriverServer} from '../../lib/safari.js';
import {simulatorApi} from '../../lib/simulator.js';

describe('SafariDriver', () => {
  afterEach(() => mock.restoreAll());

  it('should exist', () => {
    assert.ok(SafariDriver);
  });

  it('should start Safari on the Simulator that received the permissions', async () => {
    const setPermissions = mock.fn(async () => {});
    mock.method(simulatorApi, 'listSimulators', async () => [
      {
        udid: 'AAA',
        name: 'iPhone',
        state: 'Booted',
        platform: 'iOS',
        deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-15',
        runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-17-4',
      },
    ]);
    mock.method(simulatorApi, 'getSimulator', async () => ({setPermissions}) as any);
    const start = mock.method(SafariDriverServer.prototype, 'start', async () => {});
    mock.method(SafariDriverServer.prototype, 'stop', async () => {});
    mock.getter(SafariDriverServer.prototype, 'proxy', () => ({proxyReqRes: async () => {}}) as any);

    const driver = new SafariDriver();
    await driver.createSession({
      alwaysMatch: {
        platformName: 'ios',
        'appium:automationName': 'safari',
        'appium:permissions': {camera: 'yes'},
        'safari:deviceName': 'iPhone',
      },
      firstMatch: [{}],
    } as any);

    assert.equal(setPermissions.mock.callCount(), 1);
    assert.equal(start.mock.calls[0].arguments[0]?.['safari:deviceUDID'], 'AAA');
    await driver.deleteSession();
  });
});
