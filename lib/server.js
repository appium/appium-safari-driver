import log from './logger';
import { server as baseServer, routeConfiguringFunction } from 'appium-base-driver';
import SafariDriver from './driver';

async function startServer (port, address) {
  let d = new SafariDriver({port, address});
  let router = routeConfiguringFunction(d);
  let server = await baseServer(router, port, address);
  log.info(`SafariDriver server listening on http://${address}:${port}`);
  return server;
}

export { startServer };
