import assert from 'node:assert/strict';
import {afterEach, describe, it, mock} from 'node:test';

import {logger} from 'appium/support.js';

import {parsePermissions, applyPermissions} from '../../lib/permissions.js';
import {resolveSimulator, simulatorApi} from '../../lib/simulator.js';

const log = logger.getLogger('PermissionsTest');
const RUNTIME = 'com.apple.CoreSimulator.SimRuntime.iOS-17-4';
const SAFARI = 'com.apple.mobilesafari';

const device = (udid: string, state: string, name = 'iPhone') =>
  ({udid, name, state, runtimeIdentifier: RUNTIME}) as any;

describe('parsePermissions', () => {
  it('accepts valid rules', () => {
    const rules = {[SAFARI]: {location: 'yes', camera: 'no', photos: 'limited'}};
    assert.deepEqual(parsePermissions(rules), rules);
  });

  it('rejects non-objects', () => {
    assert.throws(() => parsePermissions('{}'), /must be a map/);
    assert.throws(() => parsePermissions({[SAFARI]: 'yes'}), /must be a map/);
  });
});

describe('resolveSimulator', () => {
  afterEach(() => mock.restoreAll());

  it('prefers a booted device among name matches', async () => {
    mock.method(simulatorApi, 'listSimulators', async () => [device('A', 'Shutdown'), device('B', 'Booted')]);
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'B');
  });

  it('falls back to a shutdown device unless bootedOnly', async () => {
    mock.method(simulatorApi, 'listSimulators', async () => [device('A', 'Shutdown')]);
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'A');
    assert.equal(await resolveSimulator({'safari:deviceName': 'iPhone'}, {bootedOnly: true}), null);
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
    await applyPermissions({}, log);
  });

  it('throws if no simulator matches', async () => {
    mock.method(simulatorApi, 'listSimulators', async () => []);
    await assert.rejects(applyPermissions(caps({a: {camera: 'yes'}}), log), /only supported on iOS Simulators/);
  });

  it('throws if the simulator is explicitly disabled', async () => {
    await assert.rejects(
      applyPermissions({'safari:useSimulator': false, permissions: {a: {camera: 'yes'}}}, log),
      /only supported on iOS Simulators/,
    );
  });

  it('passes the rules of each bundle to the simulator without booting it', async () => {
    const sim = mockSim('Shutdown');
    await applyPermissions(
      caps({[SAFARI]: {camera: 'yes', photos: 'limited'}, 'com.example.app': {microphone: 'no'}}),
      log,
    );
    assert.deepEqual(
      sim.setPermissions.mock.calls.map((c) => c.arguments),
      [
        [SAFARI, {camera: 'yes', photos: 'limited'}],
        ['com.example.app', {microphone: 'no'}],
      ],
    );
    assert.equal(sim.boot.mock.callCount(), 0);
  });

  it('boots the simulator for location services', async () => {
    const sim = mockSim('Shutdown');
    await applyPermissions(caps({[SAFARI]: {location: 'yes'}}), log);
    assert.equal(sim.boot.mock.callCount(), 1);
    assert.deepEqual(sim.waitForBoot.mock.calls[0].arguments, [1000]);
    assert.equal(sim.setPermissions.mock.callCount(), 1);
  });

  it('names the failed bundle in the error', async () => {
    const sim = mockSim();
    sim.setPermissions.mock.mockImplementation(async () => {
      throw new Error('boom');
    });
    await assert.rejects(
      applyPermissions(caps({[SAFARI]: {camera: 'yes'}}), log),
      /Cannot set permissions of 'com\.apple\.mobilesafari' to \{"camera":"yes"\}: boom/,
    );
  });
});
