import fs from "fs";
import { Request, Response } from "express";
import { Tail } from "tail";

const logDir = "./logs";
const logFilePath = `${logDir}/app.log`;

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
if (!fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, "");

let tail: Tail | null = null;
const clients: Response[] = [];

function broadcastLine(line: string) {
  clients.forEach((res) => {
    res.write(`event: log\ndata: ${line}\n\n`);
  });
}

export function getLogsHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  clients.push(res);

  let buffer = "";
  const readStream = fs.createReadStream(logFilePath, { encoding: "utf8" });

  readStream.on("data", (chunk: string | Buffer) => {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach((line) => {
      if (line.trim()) {
        res.write(`event: log\ndata: ${line}\n\n`);
      }
    });
  });

  readStream.on("end", () => {
    res.write(`event: ready\ndata: Initial dump complete\n\n`);

    if (!tail) {
      tail = new Tail(logFilePath);
      tail.on("line", (line) => broadcastLine(line));
      tail.on("error", (err: Error) => broadcastLine(`Error tailing file: ${err.message}`));
    }
  });

  readStream.on("error", (err: Error) => {
    res.write(`event: error\ndata: Error reading log: ${err.message}\n\n`);
  });

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
