import {NativeSimctl} from '@appium/coresim';
import type {SimPermissionService} from '@appium/coresim';
import type {AppiumLogger, StringRecord} from '@appium/types';

import {resolveSimulator} from './simulator.js';

export type PermissionState = 'yes' | 'no' | 'unset' | 'limited';

interface PermissionContext {
  udid: string;
  bundleId: string;
  simctl: NativeSimctl;
}

interface PermissionService {
  states: readonly PermissionState[];
  apply: (ctx: PermissionContext, state: PermissionState) => Promise<void>;
}

const BASIC_STATES = ['yes', 'no', 'unset'] as const;

/** Services stored as a row in the Simulator's TCC database, handled by `@appium/coresim`. */
const tccService = (name: SimPermissionService, extraStates: readonly PermissionState[] = []): PermissionService => ({
  states: [...BASIC_STATES, ...extraStates],
  apply: async ({udid, bundleId, simctl}, state) => {
    switch (state) {
      case 'yes':
      case 'limited':
        return await simctl.grantPermission(udid, name, bundleId, state === 'yes' ? 'granted' : 'limited');
      case 'no':
        return await simctl.revokePermission(udid, name, bundleId);
      case 'unset':
        return await simctl.resetPermission(udid, name, bundleId);
    }
  },
});

/** Supported services. To support a new one, add an entry here. */
const PERMISSION_SERVICES: Record<string, PermissionService> = {
  photos: tccService('photos', ['limited']),
  camera: tccService('camera'),
  microphone: tccService('microphone'),
  motion: tccService('motion'),
  speech: tccService('speech'),
  contacts: tccService('contacts'),
  calendar: tccService('calendar'),
  reminders: tccService('reminders'),
  medialibrary: tccService('medialibrary'),
};

/** Parses and validates the `permissions` capability: `{<bundleId>: {<service>: <state>}}`. */
export function parsePermissions(value: unknown): Record<string, Record<string, PermissionState>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`The 'permissions' capability must be a map of bundle identifiers to permission rules`);
  }
  for (const [bundleId, rules] of Object.entries(value)) {
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
      throw new Error(`The permission rules for '${bundleId}' must be a map of service names to states`);
    }
    for (const [service, state] of Object.entries(rules)) {
      if (!Object.hasOwn(PERMISSION_SERVICES, service)) {
        throw new Error(
          `Unsupported permission service '${service}'. Supported services: ${Object.keys(PERMISSION_SERVICES).join(', ')}`,
        );
      }
      const {states} = PERMISSION_SERVICES[service];
      if (!states.includes(state as PermissionState)) {
        throw new Error(
          `Unsupported state '${String(state)}' for '${service}'. Supported states: ${states.join(', ')}`,
        );
      }
    }
  }
  return value as Record<string, Record<string, PermissionState>>;
}

/** Applies the `permissions` capability to the target Simulator. Must run before Safari is launched. */
export async function applyPermissions(caps: StringRecord, log: AppiumLogger): Promise<void> {
  if (caps.permissions === undefined) {
    return;
  }

  const permissions = parsePermissions(caps.permissions);
  const device = await resolveSimulator(caps);
  if (!device) {
    throw new Error(
      `The 'permissions' capability is only supported on iOS Simulators, and no matching Simulator was found. ` +
        'Double check your session capabilities',
    );
  }
  const simctl = new NativeSimctl();
  for (const [bundleId, rules] of Object.entries(permissions)) {
    for (const [service, state] of Object.entries(rules)) {
      log.debug(`Setting '${service}' permission of '${bundleId}' to '${state}' on ${device.udid}`);
      try {
        await PERMISSION_SERVICES[service].apply({udid: device.udid, bundleId, simctl}, state);
      } catch (e: any) {
        throw new Error(`Cannot set '${service}' permission of '${bundleId}' to '${state}': ${e.message}`, {cause: e});
      }
    }
  }
}
