const desiredCapConstraints = {
  browserName: {
    isString: true,
    inclusionCaseInsensitive: ['safari']
  },
  browserVersion: {
    isString: true
  },
  targetPlatform: {
    isString: true,
    inclusionCaseInsensitive: ['ios', 'mac', 'macos']
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
};

export { desiredCapConstraints };
