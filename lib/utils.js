import _ from 'lodash';

const SAFARI_CAP_PREFIXES = ['safari:', 'webkit:'];

function formatCapsForServer (caps) {
  const result = {
    browserName: 'Safari',
    browserVersion: caps.browserVersion,
    platformName: caps.platformName || 'iOS',
  };
  for (const [name, value] of _.toPairs(caps)) {
    if (SAFARI_CAP_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      result[name] = value;
    }
  }
  return result;
}

export { formatCapsForServer };
