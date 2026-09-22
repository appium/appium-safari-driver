import type {StringRecord} from '@appium/types';
import {STANDARD_CAPS} from 'appium/driver.js';

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

/** Parses `com.apple.CoreSimulator.SimRuntime.iOS-17-4` into `{platform: 'iOS', version: '17.4'}`. */
function parseRuntimeIdentifier(runtimeIdentifier: string): {platform: string; version: string} | null {
  const match = /\.SimRuntime\.([A-Za-z]+)-([\d-]+)$/.exec(runtimeIdentifier);
  return match ? {platform: match[1], version: match[2].replace(/-/g, '.')} : null;
}

export {formatCapsForServer, parseRuntimeIdentifier};
