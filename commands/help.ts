import { IMessage } from "../types/message";

const Commands = {
  command: ["help", "menu"],
  trigger: /^(help|menu)/g,
  execute: async function (message: IMessage) {
    await message.reply("Halo help");
  },
};
export default Commands;
