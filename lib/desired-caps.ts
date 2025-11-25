import type {Constraints} from '@appium/types';

const desiredCapConstraints = {
  browserName: {
    isString: true,
  },
  browserVersion: {
    isString: true
  },
  acceptInsecureCerts: {
    isBoolean: true
  },
  'safari:platformVersion': {
    isString: true
  },
  'safari:platformBuildVersion': {
    isString: true
  },
  'safari:useSimulator': {
    isBoolean: true
  },
  'safari:deviceType': {
    isString: true
  },
  'safari:deviceName': {
    isString: true
  },
  'safari:deviceUDID': {
    isString: true
  },
  'safari:automaticInspection': {
    isBoolean: true
  },
  'safari:automaticProfiling': {
    isBoolean: true
  },
  'webkit:WebRTC': {
    isObject: true
  },
} as const satisfies Constraints;

export { desiredCapConstraints };

export type SafariConstraints = typeof desiredCapConstraints;

