const HOST = process.env.APPIUM_TEST_SERVER_HOST || '127.0.0.1';
const PORT = parseInt(process.env.APPIUM_TEST_SERVER_PORT, 10) || 4567;
const MOCHA_TIMEOUT = 240000;

export { HOST, PORT, MOCHA_TIMEOUT };
