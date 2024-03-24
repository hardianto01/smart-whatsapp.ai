import fs from "fs";
import path from "path";
import { IMessage } from "../types/message";

export async function handleEvent(message: IMessage) {
  let commands = [];

  // path name
  const dir = fs.readdirSync(path.join(__dirname, "../commands"));
  // load commands
  for (let fileName of dir) {
    const pathCmd = path.join(__dirname, "../commands", fileName);
    const cmd = (await import(pathCmd)).default;
    commands.push(cmd);
  }
  for (let cmd of commands) {
    // logic here
  }
  // for (let cmd of )
}
