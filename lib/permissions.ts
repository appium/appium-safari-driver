import type {AppiumLogger, StringRecord} from '@appium/types';

import {resolveSimulator, simulatorApi} from './simulator.js';

// Unlike the other services, these are not stored in the TCC database, so the Simulator must be booted
const SERVICES_REQUIRING_BOOT = ['location', 'location-always'];

const SAFARI_BUNDLE_ID = 'com.apple.mobilesafari';

/**
 * Parses the `permissions` capability: `{<service>: <state>}`.
 * Services and states are validated by the simulator library.
 */
export function parsePermissions(value: unknown): StringRecord<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`The 'permissions' capability must be a map of service names to states`);
  }
  return value as StringRecord<string>;
}

/**
 * Applies the `permissions` capability to the target Simulator. Must run before Safari is launched.
 * @returns The UDID of the Simulator that received the permissions, or `null` if none were requested.
 */
export async function applyPermissions(caps: StringRecord, log: AppiumLogger): Promise<string | null> {
  if (caps.permissions === undefined) {
    return null;
  }

  const permissions = parsePermissions(caps.permissions);
  // The Simulator list has no build or Safari versions, so these cannot be matched before changing any state
  const unverifiable = ['safari:platformBuildVersion', 'browserVersion'].filter((name) => caps[name]);
  if (unverifiable.length > 0) {
    throw new Error(
      `The 'permissions' capability cannot be combined with ${unverifiable.map((n) => `'${n}'`).join(' or ')}, ` +
        `since the matching Simulator cannot be determined. Use 'safari:deviceUDID' to select the Simulator instead`,
    );
  }
  const device = await resolveSimulator(caps);
  if (!device) {
    throw new Error(
      `The 'permissions' capability is only supported on iOS Simulators, and no matching Simulator was found. ` +
        'Double check your session capabilities',
    );
  }
  const sim = await simulatorApi.getSimulator(device.udid, {logger: log});
  const needsBoot = Object.keys(permissions).some((service) => SERVICES_REQUIRING_BOOT.includes(service.toLowerCase()));
  if (needsBoot) {
    log.info(`Booting Simulator ${device.udid} to apply the requested permissions`);
    await sim.boot();
    await sim.waitForBoot(sim.startupTimeout);
  }
  try {
    await sim.setPermissions(SAFARI_BUNDLE_ID, permissions);
  } catch (e: any) {
    throw new Error(`Cannot set permissions ${JSON.stringify(permissions)}: ${e.message}`, {cause: e});
  }
  return device.udid;
}
