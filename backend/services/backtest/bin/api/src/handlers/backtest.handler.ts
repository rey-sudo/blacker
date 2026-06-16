import { app } from "../server.js";
import {
  Backtester,
  InitParamsSchema,
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
    case CommandType.PING: {
      const outMessage: OutMessage = {
        event: "PONG",
        data: {},
        timestamp: now(),
      };

      send(socket, outMessage);
      break;
    }

    case CommandType.INIT: {
      const result = InitParamsSchema.safeParse(msg.payload);
      if (!result.success) {
        return send(socket, {
          event: "ERROR",
          data: {
            message: "Invalid InitParams payload " + result.error.issues,
          },
          timestamp: now(),
        });
      }

      backtester.init(result.data);
      break;
    }

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

  const connectedMessage: OutMessage = {
    event: "CONNECTED",
    data: { message: "Ready to receive commands" },
    timestamp: now(),
  };

  send(socket, connectedMessage);

  // 1. Create backtester instance.
  const backtester = new Backtester();

  // 2. Listen UI data
  backtester.subscribeState((state) => send(socket, state));
  backtester.subscribeEngineUpdates((update) => send(socket, update));

  // 3. Handle IN messages.
  socket.on("message", (raw: Buffer) =>
    onMessageHandler(socket, raw, backtester),
  );

  // 4. Handle close connection.
  socket.on("close", () => {
    backtester.close();
    app.log.info("Client disconnected");
  });

  // 5. Handle connection errors.
  socket.on("error", (err: Error) => {
    app.log.error(err, "WebSocket error");
  });
}
