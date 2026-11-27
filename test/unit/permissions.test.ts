import assert from 'node:assert/strict';
import {afterEach, describe, it, mock} from 'node:test';

import {logger} from 'appium/support.js';

import {parsePermissions, applyPermissions} from '../../lib/permissions.js';
import {resolveSimulator, simulatorApi} from '../../lib/simulator.js';

const log = logger.getLogger('PermissionsTest');
const RUNTIME = 'com.apple.CoreSimulator.SimRuntime.iOS-17-4';
const SAFARI = 'com.apple.mobilesafari';

const device = (udid: string, state: string, name = 'iPhone', extra: Record<string, string> = {}) =>
  ({
    udid,
    name,
    state,
    platform: 'iOS',
    runtimeIdentifier: RUNTIME,
    deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-15',
    ...extra,
  }) as any;

describe('parsePermissions', () => {
  it('accepts valid rules', () => {
    const rules = {location: 'yes', camera: 'no', photos: 'limited'};
    assert.deepEqual(parsePermissions(rules), rules);
  });

  it('rejects non-objects', () => {
    assert.throws(() => parsePermissions('{}'), /must be a map/);
    assert.throws(() => parsePermissions(['camera']), /must be a map/);
  });
});

describe('resolveSimulator', () => {
  afterEach(() => mock.restoreAll());

  const mockDevices = (...devices: any[]) => mock.method(simulatorApi, 'listSimulators', async () => devices);

  it('prefers a booted device among name matches', async () => {
    mockDevices(device('A', 'Shutdown'), device('B', 'Booted'));
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'B');
  });

  it('falls back to a shutdown device unless bootedOnly', async () => {
    mockDevices(device('A', 'Shutdown'));
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'A');
    assert.equal(await resolveSimulator({'safari:deviceName': 'iPhone'}, {bootedOnly: true}), null);
  });

  it('lets an explicit UDID rule out other devices with the same name', async () => {
    mockDevices(device('A', 'Booted'), device('B', 'Shutdown'));
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone', 'safari:deviceUDID': 'b'}))?.udid, 'B');
    assert.equal(await resolveSimulator({'safari:deviceName': 'iPad', 'safari:deviceUDID': 'b'}), null);
  });

  it('picks an eligible simulator if only useSimulator is set', async () => {
    mockDevices(device('A', 'Shutdown'), device('B', 'Booted'));
    assert.equal((await resolveSimulator({'safari:useSimulator': true}))?.udid, 'B');
    assert.equal(await resolveSimulator({}), null);
    assert.equal(await resolveSimulator({'safari:useSimulator': false, 'safari:deviceUDID': 'a'}), null);
  });

  it('skips non-iOS devices', async () => {
    mockDevices(device('A', 'Booted', 'iPhone', {platform: 'tvOS'}));
    assert.equal(await resolveSimulator({'safari:useSimulator': true}), null);
  });

  it('prefix-matches the platform version', async () => {
    mockDevices(device('A', 'Booted'));
    assert.equal((await resolveSimulator({'safari:useSimulator': true, 'safari:platformVersion': '17'}))?.udid, 'A');
    assert.equal((await resolveSimulator({'safari:useSimulator': true, 'safari:platformVersion': '17.4'}))?.udid, 'A');
    assert.equal(await resolveSimulator({'safari:useSimulator': true, 'safari:platformVersion': '1'}), null);
    assert.equal(await resolveSimulator({'safari:useSimulator': true, 'safari:platformVersion': '17.5'}), null);
  });

  it('supports runtime identifiers with a model suffix', async () => {
    mockDevices(
      device('A', 'Shutdown', 'iPhone Duo', {
        runtimeIdentifier: 'com.apple.CoreSimulator.SimRuntime.iOS-27-2-iPhone19-4',
      }),
    );
    assert.equal((await resolveSimulator({'safari:deviceUDID': 'a'}))?.udid, 'A');
    assert.equal((await resolveSimulator({'safari:deviceUDID': 'a', 'safari:platformVersion': '27.2'}))?.udid, 'A');
  });

  it('matches the device type', async () => {
    mockDevices(
      device('A', 'Booted', 'iPad', {deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPad-Pro-11-inch'}),
      device('B', 'Booted'),
    );
    assert.equal((await resolveSimulator({'safari:useSimulator': true, 'safari:deviceType': 'iPad'}))?.udid, 'A');
    assert.equal((await resolveSimulator({'safari:useSimulator': true, 'safari:deviceType': 'IPHONE'}))?.udid, 'B');
  });
});

describe('applyPermissions', () => {
  afterEach(() => mock.restoreAll());

  const caps = (permissions: unknown) => ({'safari:deviceUDID': 'abc', permissions});

  function mockSim(state = 'Booted') {
    const sim = {
      startupTimeout: 1000,
      boot: mock.fn(async () => {}),
      waitForBoot: mock.fn(async (_timeout: number) => {}),
      setPermissions: mock.fn(async (_bundleId: string, _rules: Record<string, string>) => {}),
    };
    mock.method(simulatorApi, 'listSimulators', async () => [device('ABC', state)]);
    mock.method(simulatorApi, 'getSimulator', async () => sim as any);
    return sim;
  }

  it('does nothing without the capability', async () => {
    assert.equal(await applyPermissions({}, log), null);
  });

  it('throws if no simulator matches', async () => {
    mock.method(simulatorApi, 'listSimulators', async () => []);
    await assert.rejects(applyPermissions(caps({camera: 'yes'}), log), /only supported on iOS Simulators/);
  });

  it('throws if the simulator is explicitly disabled', async () => {
    await assert.rejects(
      applyPermissions({'safari:useSimulator': false, permissions: {camera: 'yes'}}, log),
      /only supported on iOS Simulators/,
    );
  });

  it('rejects constraints that cannot be matched, without touching the simulator', async () => {
    const sim = mockSim();
    for (const extra of [{'safari:platformBuildVersion': '22A100'}, {browserVersion: '18.0'}]) {
      await assert.rejects(applyPermissions({...caps({camera: 'yes'}), ...extra}, log), /cannot be combined with/);
    }
    assert.equal(sim.setPermissions.mock.callCount(), 0);
  });

  it('passes the rules to the simulator for Safari without booting it', async () => {
    const sim = mockSim('Shutdown');
    assert.equal(await applyPermissions(caps({camera: 'yes', photos: 'limited'}), log), 'ABC');
    assert.deepEqual(
      sim.setPermissions.mock.calls.map((c) => c.arguments),
      [[SAFARI, {camera: 'yes', photos: 'limited'}]],
    );
    assert.equal(sim.boot.mock.callCount(), 0);
  });

  it('boots the simulator for location services', async () => {
    const sim = mockSim('Shutdown');
    await applyPermissions(caps({location: 'yes'}), log);
    assert.equal(sim.boot.mock.callCount(), 1);
    assert.deepEqual(sim.waitForBoot.mock.calls[0].arguments, [1000]);
    assert.equal(sim.setPermissions.mock.callCount(), 1);
  });

  it('includes the rules in the error', async () => {
    const sim = mockSim();
    sim.setPermissions.mock.mockImplementation(async () => {
      throw new Error('boom');
    });
    await assert.rejects(
      applyPermissions(caps({camera: 'yes'}), log),
      /Cannot set permissions \{"camera":"yes"\}: boom/,
    );
  });
});
