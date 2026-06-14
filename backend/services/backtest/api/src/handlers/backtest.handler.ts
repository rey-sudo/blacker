import { app } from "../server.js";
import {
  Backtester,
  StartParams,
  StartParamsSchema,
} from "../services/backtester.js";
import { CommandType, InMessage, OutMessage } from "../types/model.js";
import { now } from "../utils/now.js";
import { WebSocket } from "ws";

//----------------------------------------------------------------------------------------------------------------------
// LOGIC
//----------------------------------------------------------------------------------------------------------------------

function send(socket: WebSocket, msg: OutMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function onMessageHandler(
  socket: WebSocket,
  raw: Buffer,
  backtester: Backtester,
) {
  let msg: InMessage;

  try {
    msg = JSON.parse(raw.toString()) as InMessage;
  } catch {
    return send(socket, {
      event: "ERROR",
      data: { message: "Invalid JSON" },
      timestamp: now(),
    });
  }

  switch (msg.command) {
    case CommandType.PING:
      send(socket, {
        event: "PONG",
        data: {},
        timestamp: now(),
      } as OutMessage);
      break;

    case CommandType.START_BACKTEST: {
      const result = StartParamsSchema.safeParse(msg.payload);
      if (!result.success) {
        return send(socket, {
          event: "ERROR",
          data: {
            message: "Invalid StartParams payload " + result.error.issues,
          },
          timestamp: now(),
        });
      }

      backtester.start(result.data);
      break;
    }

    case CommandType.STOP_BACKTEST: {
      backtester.stop();
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

//----------------------------------------------------------------------------------------------------------------------
// HANDLER
//----------------------------------------------------------------------------------------------------------------------

export function backtestHandler(socket: WebSocket) {
  app.log.info("Client connected");

  send(socket, {
    event: "CONNECTED",
    data: { message: "Ready to receive commands" },
    timestamp: now(),
  } as OutMessage);

  // 1. Create backtester instance.
  const backtester = new Backtester();

  // 2. Listen UI data
  backtester.subscribeState((state) => send(socket, state));
  backtester.subscribeLiveCandles((candles) => send(socket, candles));

  // 3. Handle IN messages.
  socket.on("message", (raw: Buffer) =>
    onMessageHandler(socket, raw, backtester),
  );

  // 4. Handle close connection.
  socket.on("close", () => {
    backtester.stop();
    app.log.info("Client disconnected");
  });

  // 5. Handle connection errors.
  socket.on("error", (err: Error) => {
    app.log.error(err, "WebSocket error");
  });
}
