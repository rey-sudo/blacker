import fs from "fs";
import { Request, Response } from "express";
import { Tail } from "tail";
import { format } from 'timeago.js';

const LOG_FILE_PATH = "./logs/app.log";
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// Initialize log file
if (!fs.existsSync("./logs")) fs.mkdirSync("./logs");
if (!fs.existsSync(LOG_FILE_PATH)) fs.writeFileSync(LOG_FILE_PATH, "");

let tail: Tail | null = null;
const clients: Response[] = [];

function writeSSEMessage(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcastToAll(event: string, data: object) {
  clients.forEach((res) => writeSSEMessage(res, event, data));
}

function addSSEMetadata(data: object, type: string = 'info') {
  const { time } = data as any

  return {
    ...data,
    ago: format(time),
    sseType: type,
    sseTimestamp: new Date().toISOString()
  };
}

function processLogLine(line: string) {
  return addSSEMetadata(JSON.parse(line));
}

function createSystemMessage(msg: string, type: string = 'info') {
  return addSSEMetadata({ msg }, type);
}

export function getLogsHandler(req: Request, res: Response) {
  res.writeHead(200, SSE_HEADERS);
  clients.push(res);

  // Send historical logs
  let buffer = "";
  const readStream = fs.createReadStream(LOG_FILE_PATH, { encoding: "utf8" });

  readStream.on("data", (chunk: string | Buffer) => {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    lines.forEach((line) => {
      if (line.trim()) {
        const logData = processLogLine(line);
        writeSSEMessage(res, "log", logData);
      }
    });
  });

  readStream.on("end", () => {
    writeSSEMessage(res, "ready", createSystemMessage("Initial dump complete", "ready"));
    
    // Start tailing for new logs
    if (!tail) {
      tail = new Tail(LOG_FILE_PATH);
      tail.on("line", (line) => {
        broadcastToAll("log", processLogLine(line));
      });
      tail.on("error", (err: Error) => {
        broadcastToAll("error", createSystemMessage(`Error tailing file: ${err.message}`, "error"));
      });
    }
  });

  readStream.on("error", (err: Error) => {
    writeSSEMessage(res, "error", createSystemMessage(`Error reading log: ${err.message}`, "error"));
  });

  // Cleanup on client disconnect
  req.on("close", () => {
    readStream.destroy();
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
    
    if (clients.length === 0 && tail) {
      tail.unwatch();
      tail = null;
    }
  });
}