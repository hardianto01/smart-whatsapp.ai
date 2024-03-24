import makeWASocket, {
  MessageUpsertType,
  UserFacingSocketConfig,
  getContentType,
  proto,
} from "@whiskeysockets/baileys";
import { IMessage } from "../types/message";

export const MakeClient = (config: UserFacingSocketConfig) => {
  const socket = makeWASocket(config);

  function reply(
    from: string | null | undefined,
    data: string | Buffer,
    m: proto.IWebMessageInfo
  ) {
    if (!(from && data)) return;
    if (typeof data === "string")
      socket.sendMessage(from, { text: data }, { quoted: m });
  }

  async function handleMessage(arg: {
    messages: proto.IWebMessageInfo[];
    type: MessageUpsertType;
  }) {
    let message = arg.messages[0].message as proto.IMessage;
    let simpleMessage: IMessage = {} as any;
    if (!message) return;
    let contentType = getContentType(message);
    if (!contentType) return;
    let content = message[contentType];
    if (!content) return;
    if (typeof content === "string") {
      simpleMessage.text = content;
    } else if (typeof content !== "string" && content) {
      if (contentType == "extendedTextMessage") {
        simpleMessage.text = (content as any).text;
        simpleMessage.quoted = (content as any).contextInfo.quotedMessage;
      }
      // message.text = (content as any).caption;
      // message.mimetype = (content as any).mimetype;
      // message.url = (content as any).url;
      // message.fileSha256 = (content as any).fileSha256;
      // message.fileEncSha256 = (content as any).fileEncSha256;
      // message.mediaKey = (content as any).mediaKey;
      // message.directPath = (content as any).directPath;
      // message.jpegThumbnail = (content as any).jpegThumbnail;
    }
    simpleMessage = { ...(content as any) };
    simpleMessage.type = contentType;
    simpleMessage.from = arg.messages[0].key.remoteJid;
    simpleMessage.sender =
      arg.messages[0].key.participant || arg.messages[0].key.remoteJid;

    simpleMessage.reply = async (chat: string) => {
      reply(simpleMessage?.from, chat, arg.messages[0]);
    };
    socket.ev.emit("message" as any, simpleMessage);
    return message;
  }

  return { ...socket, reply, handleMessage };
};
