import type {AppiumLogger, StringRecord} from '@appium/types';

import {resolveSimulator, simulatorApi} from './simulator.js';

// Unlike the other services, these are not stored in the TCC database, so the Simulator must be booted
const SERVICES_REQUIRING_BOOT = ['location', 'location-always'];

/**
 * Parses the `permissions` capability: `{<bundleId>: {<service>: <state>}}`.
 * Services and states are validated by the simulator library.
 */
export function parsePermissions(value: unknown): Record<string, StringRecord<string>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`The 'permissions' capability must be a map of bundle identifiers to permission rules`);
  }
  for (const [bundleId, rules] of Object.entries(value)) {
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
      throw new Error(`The permission rules for '${bundleId}' must be a map of service names to states`);
    }
  }
  return value as Record<string, StringRecord<string>>;
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
  const sim = await simulatorApi.getSimulator(device.udid, {logger: log});
  const needsBoot = Object.values(permissions).some((rules) =>
    Object.keys(rules).some((service) => SERVICES_REQUIRING_BOOT.includes(service.toLowerCase())),
  );
  if (needsBoot) {
    log.info(`Booting Simulator ${device.udid} to apply the requested permissions`);
    await sim.boot();
    await sim.waitForBoot(sim.startupTimeout);
  }
  for (const [bundleId, rules] of Object.entries(permissions)) {
    try {
      await sim.setPermissions(bundleId, rules);
    } catch (e: any) {
      throw new Error(`Cannot set permissions of '${bundleId}' to ${JSON.stringify(rules)}: ${e.message}`, {cause: e});
    }
  }
}
