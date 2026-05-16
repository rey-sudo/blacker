import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { onMessageHandler } from "./handlers/onMessageHandler.js";
import { OutgoingMessage } from "./model.js";


export function send(socket: WebSocket, msg: OutgoingMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export const app = Fastify({ logger: true });

await app.register(fastifyWebsocket);

app.get("/backtest", { websocket: true }, (socket: WebSocket) => {

  //const watcher = new StatsWatcher();

  app.log.info("Client connected");

  send(socket, {
    event: "CONNECTED",
    data: { message: "Ready to receive commands" },
    timestamp: new Date().toISOString(),
  });

  socket.on("message", (raw: Buffer)=> onMessageHandler(raw, socket));

  socket.on("close", () => {
    app.log.info("Client disconnected");
  });

  socket.on("error", (err: Error) => {
    app.log.error(err, "WebSocket error");
  });
});
