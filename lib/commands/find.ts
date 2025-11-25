import { util } from 'appium/support';
import type { SafariDriver } from '../driver';

/**
 * Find element(s) using the specified strategy and selector.
 * This is needed to make lookup by image working.
 *
 * @param strategy - The locator strategy to use
 * @param selector - The selector value
 * @param mult - Whether to find multiple elements
 * @param context - Optional context element ID
 * @returns Promise that resolves to the found element(s)
 */
export async function findElOrEls (
  this: SafariDriver,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: string
): Promise<any> {
  const endpoint = `/element${context ? `/${util.unwrapElement(context)}/element` : ''}${mult ? 's' : ''}`;
  return await this.safari.proxy.command(endpoint, 'POST', {
    using: strategy,
    value: selector,
  });
}

