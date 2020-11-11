import findCmds from './find';
import recordScreenCommands from './record-screen';

const commands = {};
Object.assign(
  commands,
  findCmds,
  recordScreenCommands,
  // add other command types here
);

export { commands };
export default commands;
