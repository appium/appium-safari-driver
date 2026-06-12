import {Simctl} from 'node-simctl';

export const HOST = process.env.APPIUM_TEST_SERVER_HOST || '127.0.0.1';
export const PORT = parseInt(process.env.APPIUM_TEST_SERVER_PORT || '4567', 10);
export const TEST_TIMEOUT = 240000;

export interface SimulatorTarget {
  simctl: Simctl;
  platformVersion: string;
  deviceName: string;
  udid: string;
  state: string;
}

/**
 * Resolves the iOS Simulator to use for mobile Safari e2e tests from environment variables.
 * Requires PLATFORM_VERSION and DEVICE_NAME. DEVICE_UDID is optional.
 */
export async function resolveSimulatorTarget(): Promise<SimulatorTarget> {
  const platformVersion = process.env.PLATFORM_VERSION;
  const deviceName = process.env.DEVICE_NAME;
  if (!platformVersion || !deviceName) {
    throw new Error('PLATFORM_VERSION and DEVICE_NAME environment variables must be set');
  }

  const simctl = new Simctl();
  const allDevices = await simctl.getDevices(platformVersion, 'iOS');
  const envUdid = process.env.DEVICE_UDID;
  const device = envUdid
    ? allDevices.find(({udid}) => udid.toLowerCase() === envUdid.toLowerCase())
    : allDevices.find(({name}) => name === deviceName);
  if (!device) {
    throw new Error(`Cannot find '${deviceName}' simulator for iOS ${platformVersion}`);
  }

  simctl.udid = device.udid;
  return {
    simctl,
    platformVersion,
    deviceName: device.name,
    udid: device.udid,
    state: device.state,
  };
}
