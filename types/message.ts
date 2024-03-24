import { proto } from "@whiskeysockets/baileys";

export declare type IMessage = {
      [x: string]: any;
      // from?: string | null | undefined;
      // sender?: string | null | undefined;
      // fromMe?: boolean
      // text?: string;
      // caption?: string;
      // type?: string;
      // mimetype?: string;
      // url?: string;
      // fileSha256?: Uint8Array;
      // fileEncSha256?: Uint8Array;
      // mediaKey?: Uint8Array;
      // directPath?: string;
      // jpegThumbnail?: Uint8Array;
      reply: (message: string) => Promise<proto.IWebMessageInfo | void>;

    }
