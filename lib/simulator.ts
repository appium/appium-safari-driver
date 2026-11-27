import type {StringRecord} from '@appium/types';
import {getSimulator, listSimulators} from 'appium-ios-simulator';
import type {SimulatorListEntry} from 'appium-ios-simulator';

import {parseRuntimeIdentifier} from './utils.js';

/** Thin seam over the simulator library, so it can be replaced in unit tests. */
export const simulatorApi = {getSimulator, listSimulators};

/** Numbers are prefix-matched, e.g. '17' matches '17.4', but not '170'. */
function isVersionMatch(requested: string, actual: string): boolean {
  return actual === requested || actual.startsWith(`${requested}.`);
}

/**
 * Finds all iOS Simulators matching the session capabilities. Every specified capability must match.
 */
export async function findSimulators(
  caps: StringRecord,
  {bootedOnly = false}: {bootedOnly?: boolean} = {},
): Promise<SimulatorListEntry[]> {
  const udid = caps['safari:deviceUDID']?.toLowerCase();
  const name = caps['safari:deviceName']?.toLowerCase();
  const deviceType = caps['safari:deviceType']?.toLowerCase();
  const platformVersion = caps['safari:platformVersion'];
  // Without a device identifier, a simulator must be requested explicitly
  if (caps['safari:useSimulator'] === false || (!udid && !name && caps['safari:useSimulator'] !== true)) {
    return [];
  }

  return (await simulatorApi.listSimulators()).filter((device) => {
    if (device.platform !== 'iOS' || (bootedOnly && device.state !== 'Booted')) {
      return false;
    }
    if (udid && udid !== device.udid.toLowerCase()) {
      return false;
    }
    if (name && name !== device.name.toLowerCase()) {
      return false;
    }
    if (deviceType) {
      const type = /\.SimDeviceType\.([A-Za-z]+)/.exec(device.deviceTypeIdentifier)?.[1];
      if (type?.toLowerCase() !== deviceType) {
        return false;
      }
    }
    if (platformVersion) {
      const version = parseRuntimeIdentifier(device.runtimeIdentifier)?.version;
      if (!version || !isVersionMatch(platformVersion, version)) {
        return false;
      }
    }
    return true;
  });
}

/** Finds the iOS Simulator matching the session capabilities, preferring a booted one. */
export async function resolveSimulator(caps: StringRecord): Promise<SimulatorListEntry | null> {
  const matches = await findSimulators(caps);
  return matches.find((device) => device.state === 'Booted') ?? matches[0] ?? null;
}
