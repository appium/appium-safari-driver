import { STANDARD_CAPS } from 'appium/driver';
import _ from 'lodash';
import type { StringRecord } from '@appium/types';

const SAFARI_CAP_PREFIXES = ['safari:', 'webkit:'];

function formatCapsForServer (caps: StringRecord): StringRecord {
  const result: StringRecord = {
    browserName: 'Safari',
    browserVersion: caps.browserVersion,
    platformName: caps.platformName || 'iOS',
  };
  for (const [name, value] of _.toPairs(caps)) {
    if (SAFARI_CAP_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      result[name] = value;
    } else if (!_.has(result, name) && STANDARD_CAPS.has(name as any)) {
      result[name] = value;
    }
  }
  return result;
}

export { formatCapsForServer };

