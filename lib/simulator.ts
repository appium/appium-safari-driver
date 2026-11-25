import {NativeSimctl, SimDeviceState} from '@appium/coresim';
import type {SimDeviceInfo} from '@appium/coresim';
import type {StringRecord} from '@appium/types';

import {parseRuntimeIdentifier} from './utils.js';

/**
 * Finds the iOS Simulator matching the session capabilities, or `null` if there is none.
 * If several devices match by name, a booted one is preferred.
 */
export async function resolveSimulator(
  caps: StringRecord,
  {bootedOnly = false}: {bootedOnly?: boolean} = {},
): Promise<SimDeviceInfo | null> {
  if (caps['safari:useSimulator'] === false) {
    return null;
  }

  let firstMatch: SimDeviceInfo | null = null;
  for (const device of await new NativeSimctl().getDevices()) {
    const {name, udid, state, runtimeIdentifier} = device;
    const isBooted = state === SimDeviceState.Booted;
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
