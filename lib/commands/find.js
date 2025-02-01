import { util } from 'appium/support';

// This is needed to make lookup by image working
/**
 *
 * @this {SafariDriver}
 * @param {string} strategy
 * @param {string} selector
 * @param {boolean} mult
 * @param {string} [context]
 * @returns {Promise<any>}
 */
export async function findElOrEls (strategy, selector, mult, context) {
  const endpoint = `/element${context ? `/${util.unwrapElement(context)}/element` : ''}${mult ? 's' : ''}`;
  return await this.safari.proxy.command(endpoint, 'POST', {
    using: strategy,
    value: selector,
  });
}

/**
 * @typedef {import('../driver').SafariDriver} SafariDriver
 */
