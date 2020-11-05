import { util } from 'appium-support';


const commands = {};

commands.findElOrEls = async function findElOrEls (strategy, selector, mult, context) {
  context = util.unwrapElement(context);
  const endpoint = `/element${context ? `/${context}/element` : ''}${mult ? 's' : ''}`;

  return await this.safari.sendCommand(endpoint, 'POST', {
    using: strategy,
    value: selector,
  });
};


export { commands };
export default commands;
