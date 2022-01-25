const commands = {};

commands.deleteCookies = async function deleteCookies () {
  return await this.safari.proxy.command('/cookie', 'DELETE');
};

export { commands };
export default commands;
