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
    const rules = {[SAFARI]: {camera: 'yes', microphone: 'no', photos: 'limited'}};
    assert.deepEqual(parsePermissions(rules), rules);
  });

  it('rejects non-objects', () => {
    assert.throws(() => parsePermissions('{}'), /must be a map/);
    assert.throws(() => parsePermissions({[SAFARI]: 'yes'}), /must be a map/);
  });

  it('rejects unknown services and states', () => {
    assert.throws(() => parsePermissions({a: {location: 'yes'}}), /Unsupported permission service/);
    assert.throws(() => parsePermissions({a: {camera: 'maybe'}}), /Unsupported state/);
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
    return {
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
    await assert.rejects(applyPermissions(caps({a: {camera: 'yes'}}), log), /only supported on iOS Simulators/);
  });

  it('throws if the simulator is explicitly disabled', async () => {
    await assert.rejects(
      applyPermissions({'safari:useSimulator': false, permissions: {a: {camera: 'yes'}}}, log),
      /only supported on iOS Simulators/,
    );
  });

  it('maps TCC-backed services to coresim calls', async () => {
    const m = mockSimctl();
    await applyPermissions(
      caps({[SAFARI]: {camera: 'yes', microphone: 'no', motion: 'unset', photos: 'limited'}}),
      log,
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
    const m = mockSimctl();
    m.grant.mock.mockImplementation(async () => {
      throw new Error('boom');
    });
    await assert.rejects(
      applyPermissions(caps({[SAFARI]: {camera: 'yes'}}), log),
      /Cannot set 'camera' permission of 'com\.apple\.mobilesafari' to 'yes': boom/,
    );
  });
});
