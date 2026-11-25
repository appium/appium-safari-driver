import type {StringRecord} from '@appium/types';
import {getSimulator, listSimulators} from 'appium-ios-simulator';
import type {SimulatorListEntry} from 'appium-ios-simulator';

import {parseRuntimeIdentifier} from './utils.js';

/** Thin seam over the simulator library, so it can be replaced in unit tests. */
export const simulatorApi = {getSimulator, listSimulators};

/**
 * Finds the iOS Simulator matching the session capabilities, or `null` if there is none.
 * If several devices match by name, a booted one is preferred.
 */
export async function resolveSimulator(
  caps: StringRecord,
  {bootedOnly = false}: {bootedOnly?: boolean} = {},
): Promise<SimulatorListEntry | null> {
  if (caps['safari:useSimulator'] === false) {
    return null;
  }

  let firstMatch: SimulatorListEntry | null = null;
  for (const device of await simulatorApi.listSimulators()) {
    const {name, udid, state, runtimeIdentifier} = device;
    const isBooted = state === 'Booted';
    if (bootedOnly && !isBooted) {
      continue;
    }
    const runtimeInfo = parseRuntimeIdentifier(runtimeIdentifier);
    if (runtimeInfo?.platform !== 'iOS') {
      continue;
    }

    if (caps['safari:deviceUDID']?.toLowerCase() === udid.toLowerCase()) {
      return device;
    }
    if (
      caps['safari:deviceName']?.toLowerCase() === name.toLowerCase() &&
      ((caps['safari:platformVersion'] && caps['safari:platformVersion'] === runtimeInfo.version) ||
        !caps['safari:platformVersion'])
    ) {
      if (isBooted) {
        return device;
      }
      firstMatch ??= device;
    }
  }

  return firstMatch;
}
