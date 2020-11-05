import { util } from 'appium-support';


const commands = {};

commands.findElOrEls = async function findElOrEls (strategy, selector, mult, context) {
  context = util.unwrapElement(context);
  const endpoint = `/element${context ? `/${context}/element` : ''}${mult ? 's' : ''}`;

  // Should we do this workaround or just let it fail?
  // W3C standard defines id/name selectors as obsolete (subset of css)
  switch (strategy) {
    case 'id':
      strategy = 'css selector';
      selector = `#${selector}`;
      break;
    case 'name':
      strategy = 'css selector';
      selector = `[name='${selector.replace(/'/g, "\\'")}']`;
      break;
  }

  return await this.safari.proxy.command(endpoint, 'POST', {
    using: strategy,
    value: selector,
  });
};


export { commands };
export default commands;
