import {STANDARD_CAPS} from 'appium/driver';
import type {StringRecord} from '@appium/types';

const SAFARI_CAP_PREFIXES = ['safari:', 'webkit:'];

/**
 * Formats the given capabilities for use with Safari Driver Server.
 * @param caps - The capabilities to format.
 * @returns The formatted capabilities.
 */
function formatCapsForServer(caps: StringRecord): StringRecord {
  const result: StringRecord = {
    browserName: 'Safari',
    browserVersion: caps.browserVersion,
    platformName: caps.platformName || 'iOS',
  };
  for (const [name, value] of Object.entries(caps)) {
    if (SAFARI_CAP_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      result[name] = value;
    } else if (!Object.hasOwn(result, name) && STANDARD_CAPS.has(name as any)) {
      result[name] = value;
    }
  }
  return result;
}

export {formatCapsForServer};
