import findCmds from './find';
import cookieCmds from './cookies';
import recordScreenCommands from './record-screen';

const commands = {};
Object.assign(
  commands,
  findCmds,
  cookieCmds,
  recordScreenCommands,
  // add other command types here
);

export { commands };
export default commands;
