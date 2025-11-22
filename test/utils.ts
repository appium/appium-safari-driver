export const HOST = process.env.APPIUM_TEST_SERVER_HOST || '127.0.0.1';
export const PORT = parseInt(process.env.APPIUM_TEST_SERVER_PORT || '4567', 10);
export const MOCHA_TIMEOUT = 240000;

