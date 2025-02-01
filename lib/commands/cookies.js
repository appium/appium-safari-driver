
/**
 * @this {SafariDriver}
 * @returns {Promise<any>}
 */
export async function deleteCookies () {
  return await this.safari.proxy.command('/cookie', 'DELETE');
}

/**
 * @typedef {import('../driver').SafariDriver} SafariDriver
 */
