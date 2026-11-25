import assert from 'node:assert/strict';
import {afterEach, describe, it, mock} from 'node:test';

import {NativeSimctl, SimDeviceState} from '@appium/coresim';
import {logger} from 'appium/support.js';

import {parsePermissions, applyPermissions} from '../../lib/permissions.js';
import {resolveSimulator} from '../../lib/simulator.js';

const log = logger.getLogger('PermissionsTest');
const RUNTIME = 'com.apple.CoreSimulator.SimRuntime.iOS-17-4';
const SAFARI = 'com.apple.mobilesafari';

const device = (udid: string, state: SimDeviceState, name = 'iPhone') =>
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

  it('rejects unknown services and states', () => {
    assert.throws(() => parsePermissions({a: {health: 'yes'}}), /Unsupported permission service/);
    assert.throws(() => parsePermissions({a: {location: 'maybe'}}), /Unsupported state/);
    assert.throws(() => parsePermissions({a: {camera: 'limited'}}), /Unsupported state/);
  });
});

describe('resolveSimulator', () => {
  afterEach(() => mock.restoreAll());

  it('prefers a booted device among name matches', async () => {
    mock.method(NativeSimctl.prototype, 'getDevices', async () => [
      device('A', SimDeviceState.Shutdown),
      device('B', SimDeviceState.Booted),
    ]);
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'B');
  });

  it('falls back to a shutdown device unless bootedOnly', async () => {
    mock.method(NativeSimctl.prototype, 'getDevices', async () => [device('A', SimDeviceState.Shutdown)]);
    assert.equal((await resolveSimulator({'safari:deviceName': 'iPhone'}))?.udid, 'A');
    assert.equal(await resolveSimulator({'safari:deviceName': 'iPhone'}, {bootedOnly: true}), null);
  });
});

describe('applyPermissions', () => {
  afterEach(() => mock.restoreAll());

  const caps = (permissions: unknown) => ({'safari:deviceUDID': 'abc', permissions});

  function mockSimctl(state = SimDeviceState.Booted) {
    mock.method(NativeSimctl.prototype, 'getDevices', async () => [device('ABC', state)]);
    mock.method(NativeSimctl.prototype, 'waitForBoot', async () => {});
    return {
      boot: mock.method(NativeSimctl.prototype, 'bootDevice', async () => {}),
      grant: mock.method(NativeSimctl.prototype, 'grantPermission', async () => {}),
      revoke: mock.method(NativeSimctl.prototype, 'revokePermission', async () => {}),
      reset: mock.method(NativeSimctl.prototype, 'resetPermission', async () => {}),
    };
  }

  it('does nothing without the capability', async () => {
    await applyPermissions({}, log);
  });

  it('throws if no simulator matches', async () => {
    mock.method(NativeSimctl.prototype, 'getDevices', async () => []);
    await assert.rejects(applyPermissions(caps({a: {location: 'yes'}}), log), /only supported on iOS Simulators/);
  });

  it('throws if the simulator is explicitly disabled', async () => {
    await assert.rejects(
      applyPermissions({'safari:useSimulator': false, permissions: {a: {location: 'yes'}}}, log),
      /only supported on iOS Simulators/,
    );
  });

  it('boots a shutdown simulator and maps simctl-backed services', async () => {
    const m = mockSimctl(SimDeviceState.Shutdown);
    const calls: string[][] = [];
    const exec = async (_cmd: string, args: string[]) => void calls.push(args);
    await applyPermissions(
      caps({[SAFARI]: {location: 'yes', 'location-always': 'no', 'photos-add': 'unset'}}),
      log,
      exec,
    );
    assert.equal(m.boot.mock.callCount(), 1);
    assert.deepEqual(calls, [
      ['simctl', 'privacy', 'ABC', 'grant', 'location', SAFARI],
      ['simctl', 'privacy', 'ABC', 'revoke', 'location-always', SAFARI],
      ['simctl', 'privacy', 'ABC', 'reset', 'photos-add', SAFARI],
    ]);
  });

  it('does not boot an already booted simulator', async () => {
    const m = mockSimctl();
    await applyPermissions(caps({[SAFARI]: {camera: 'yes'}}), log, async () => {});
    assert.equal(m.boot.mock.callCount(), 0);
  });

  it('tolerates a concurrent boot', async () => {
    const m = mockSimctl(SimDeviceState.Shutdown);
    let calls = 0;
    mock.method(NativeSimctl.prototype, 'getDevices', async () => [
      device('ABC', calls++ === 0 ? SimDeviceState.Shutdown : SimDeviceState.Booted),
    ]);
    m.boot.mock.mockImplementation(async () => {
      throw new Error('already booted');
    });
    await applyPermissions(caps({[SAFARI]: {camera: 'yes'}}), log, async () => {});
  });

  it('maps TCC-backed services to coresim calls', async () => {
    const m = mockSimctl();
    await applyPermissions(
      caps({[SAFARI]: {camera: 'yes', microphone: 'no', motion: 'unset', photos: 'limited'}}),
      log,
      async () => {},
    );
    assert.deepEqual(
      m.grant.mock.calls.map((c) => c.arguments),
      [
        ['ABC', 'camera', SAFARI, 'granted'],
        ['ABC', 'photos', SAFARI, 'limited'],
      ],
    );
    assert.deepEqual(m.revoke.mock.calls[0].arguments, ['ABC', 'microphone', SAFARI]);
    assert.deepEqual(m.reset.mock.calls[0].arguments, ['ABC', 'motion', SAFARI]);
  });

  it('names the failed rule in the error', async () => {
    mockSimctl();
    await assert.rejects(
      applyPermissions(caps({[SAFARI]: {location: 'yes'}}), log, async () => {
        throw new Error('boom');
      }),
      /Cannot set 'location' permission of 'com\.apple\.mobilesafari' to 'yes': boom/,
    );
  });
});
