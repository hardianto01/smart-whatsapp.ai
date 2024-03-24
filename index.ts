import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import readline from "readline";
import fs from "fs";

import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  useMultiFileAuthState,
  WAMessageContent,
  WAMessageKey,
} from "@whiskeysockets/baileys";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import { IConfig } from "./types";
import { MakeClient } from "./library/client";
import { handleEvent } from "./library/handler";

const config: IConfig = JSON.parse(fs.readFileSync("config.json").toString());
const logger = MAIN_LOGGER.child({});
logger.level = "silent";

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterCache = new NodeCache();

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({ logger });
store?.readFromFile(config.store);
// save every 10s
setInterval(() => {
  store?.writeToFile(config.store);
}, 10_000);

// start a connection
const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(config.session);
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = MakeClient({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    // ignore all broadcast messages -- to receive the same
    // comment the line below out
    // shouldIgnoreJid: jid => isJidBroadcast(jid),
    // implement to handle retries & poll updates
    getMessage,
  });

  store?.bind(sock.ev);

  function handleConnection(connections: Partial<ConnectionState>) {
    const { connection, lastDisconnect } = connections;
    if (connection === "close") {
      if (
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        startSock();
      } else {
        console.log("Connection closed. You are logged out.");
      }
    }
    console.log("connection update", connections);
  }

  sock.ev.on("connection.update", handleConnection);
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", sock.handleMessage.bind(sock));
  sock.ev.on("message" as any, handleEvent);

  // sock.ev.process(async (events) => {
  //   if (events["labels.association"]) {
  //     console.log(events["labels.association"]);
  //   }

  //   if (events["labels.edit"]) {
  //     console.log(events["labels.edit"]);
  //   }

  //   if (events.call) {
  //     console.log("recv call event", events.call);
  //   }

  //   // history received
  //   if (events["messaging-history.set"]) {
  //     const { chats, contacts, messages, isLatest } =
  //       events["messaging-history.set"];
  //     console.log(
  //       `recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`
  //     );
  //   }

  //   // received a new message
  

  //   // messages updated like status delivered, message deleted etc.
  //   if (events["messages.update"]) {
  //     for (const { key, update } of events["messages.update"]) {
  //       if (update.pollUpdates) {
  //         const pollCreation = await getMessage(key);
  //         if (pollCreation) {
  //           console.log(
  //             "got poll update, aggregation: ",
  //             getAggregateVotesInPollMessage({
  //               message: pollCreation,
  //               pollUpdates: update.pollUpdates,
  //             })
  //           );
  //         }
  //       }
  //     }
  //   }

  //   if (events["message-receipt.update"]) {
  //     console.log(events["message-receipt.update"]);
  //   }

  //   if (events["messages.reaction"]) {
  //     console.log(events["messages.reaction"]);
  //   }

  //   if (events["presence.update"]) {
  //     console.log(events["presence.update"]);
  //   }

  //   if (events["chats.update"]) {
  //     console.log(events["chats.update"]);
  //   }

  //   if (events["contacts.update"]) {
  //     for (const contact of events["contacts.update"]) {
  //       if (typeof contact.imgUrl !== "undefined") {
  //         const newUrl =
  //           contact.imgUrl === null
  //             ? null
  //             : await sock!.profilePictureUrl(contact.id!).catch(() => null);
  //         console.log(`contact ${contact.id} has a new profile pic: ${newUrl}`);
  //       }
  //     }
  //   }

  //   if (events["chats.delete"]) {
  //     console.log("chats deleted ", events["chats.delete"]);
  //   }
  // });

  return sock;

  async function getMessage(
    key: WAMessageKey
  ): Promise<WAMessageContent | undefined> {
    if (store) {
      const msg = await store.loadMessage(key.remoteJid!, key.id!);
      return msg?.message || undefined;
    }

    // only if store is present
    return proto.Message.fromObject({});
  }
};

startSock();
