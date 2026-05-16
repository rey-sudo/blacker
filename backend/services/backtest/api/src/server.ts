import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
type CommandType = "START_BACKTEST" | "STOP_BACKTEST";
 
interface IncomingMessage {
  command: CommandType;
  payload?: Record<string, unknown>;
}
 
interface OutgoingMessage {
  event: string;
  data?: unknown;
  timestamp: string;
}
 
// ─── Backtest Runner ──────────────────────────────────────────────────────────
 
class BacktestRunner {
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
 
  start(onTick: (tick: number) => void, onDone: () => void): void {
    if (this.running) return;
 
    this.running = true;
    this.tick = 0;
 
    this.intervalId = setInterval(() => {
      this.tick++;
      onTick(this.tick);
 
      // Simulate backtest finishing after 10 ticks
      if (this.tick >= 10) {
        this.stop();
        onDone();
      }
    }, 500);
  }
 
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    this.tick = 0;
  }
 
  isRunning(): boolean {
    return this.running;
  }
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function send(socket: WebSocket, msg: OutgoingMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}
 
function now(): string {
  return new Date().toISOString();
}
 
// ─── Server ───────────────────────────────────────────────────────────────────
 
export const app = Fastify({ logger: true });
 
await app.register(fastifyWebsocket);
 
app.get(
  "/backtest",
  { websocket: true },
  (socket: WebSocket) => {
    const runner = new BacktestRunner();
 
    app.log.info("Client connected");
 
    send(socket, {
      event: "CONNECTED",
      data: { message: "Ready to receive commands" },
      timestamp: now(),
    });
 
    socket.on("message", (raw: Buffer) => {
      let msg: IncomingMessage;
 
      // ── Parse ──
      try {
        msg = JSON.parse(raw.toString()) as IncomingMessage;
      } catch {
        send(socket, { event: "ERROR", data: { message: "Invalid JSON" }, timestamp: now() });
        return;
      }
 
      // ── Dispatch ──
      switch (msg.command) {
        case "START_BACKTEST": {
          if (runner.isRunning()) {
            send(socket, {
              event: "ERROR",
              data: { message: "Backtest already running" },
              timestamp: now(),
            });
            break;
          }
 
          send(socket, { event: "BACKTEST_STARTED", timestamp: now() });
 
          runner.start(
            (tick) => {
              send(socket, {
                event: "BACKTEST_TICK",
                data: { tick, progress: `${tick * 10}%` },
                timestamp: now(),
              });
            },
            () => {
              send(socket, {
                event: "BACKTEST_COMPLETED",
                data: { message: "Backtest finished successfully" },
                timestamp: now(),
              });
            }
          );
          break;
        }
 
        case "STOP_BACKTEST": {
          if (!runner.isRunning()) {
            send(socket, {
              event: "ERROR",
              data: { message: "No backtest is running" },
              timestamp: now(),
            });
            break;
          }
 
          runner.stop();
          send(socket, {
            event: "BACKTEST_STOPPED",
            data: { message: "Backtest stopped by user" },
            timestamp: now(),
          });
          break;
        }
 
        default: {
          send(socket, {
            event: "ERROR",
            data: { message: `Unknown command: ${(msg as IncomingMessage).command}` },
            timestamp: now(),
          });
        }
      }
    });
 
    socket.on("close", () => {
      runner.stop();
      app.log.info("Client disconnected");
    });
 
    socket.on("error", (err: Error) => {
      app.log.error(err, "WebSocket error");
      runner.stop();
    });
  }
);