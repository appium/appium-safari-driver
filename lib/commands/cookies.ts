import type { SafariDriver } from '../driver';

/**
 * Delete all cookies visible to the current page.
 *
 * @returns Promise that resolves when cookies are deleted
 */
export async function deleteCookies (this: SafariDriver): Promise<any> {
  return await this.safari.proxy.command('/cookie', 'DELETE');
}

