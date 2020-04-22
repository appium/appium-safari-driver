import log from './logger';
import { server as baseServer, routeConfiguringFunction as makeRouter } from 'appium-base-driver';
import SafariDriver from './driver';

async function startServer (port, address) {
  let d = new SafariDriver({port, address});
  let routeConfiguringFunction = makeRouter(d);
  let server = await baseServer({routeConfiguringFunction, port, hostname: address});
  log.info(`SafariDriver server listening on http://${address}:${port}`);
  return server;
}

export { startServer };
