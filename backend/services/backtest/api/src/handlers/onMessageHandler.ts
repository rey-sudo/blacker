import { IncomingMessage, OutgoingMessage } from "../model.js";
import { WebSocket } from "ws";
import { send } from "../server.js";

function now(): string {
  return new Date().toISOString();
}

export function onMessageHandler(raw: Buffer, socket: WebSocket) {
  let msg: IncomingMessage;

  try {
    msg = JSON.parse(raw.toString()) as IncomingMessage;
  } catch {
    send(socket, {
      event: "ERROR",
      data: { message: "Invalid JSON" },
      timestamp: now(),
    });
    return;
  }

  // ── Dispatch ──
  switch (msg.command) {
    case "START_BACKTEST": {
      break;
    }

    case "STOP_BACKTEST": {
      break;
    }

    default: {
      send(socket, {
        event: "ERROR",
        data: {
          message: `Unknown command`,
        },
        timestamp: now(),
      });
    }
  }
}
