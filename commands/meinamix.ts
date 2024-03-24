import { IMessage } from "../types/message";

const Commands = {
  command: ["meinamix", "meina"],
  trigger: /^(meinamix|meina)$/g,
  execute: async function (message: IMessage) {
    await message.reply("Halo help");
  },
};
export default Commands;
