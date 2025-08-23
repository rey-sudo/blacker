import fs from "fs";
import { Request, Response } from "express";
import { Tail } from "tail";

const logFilePath = "./logs/app.log";

if (!fs.existsSync("./logs")) fs.mkdirSync("./logs");
if (!fs.existsSync(logFilePath)) fs.writeFileSync(logFilePath, "");

export function getLogsHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const readStream = fs.createReadStream(logFilePath, { encoding: "utf8" });

  readStream.on("data", (chunk: string | Buffer) => {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        res.write(`event: log\ndata: ${line}\n\n`);
      }
    }
  });

  readStream.on("end", () => {
    res.write(`event: ready\ndata: Initial dump complete\n\n`);

    try {
      const tail = new Tail(logFilePath);

      tail.on("line", (line) => {
        res.write(`event: log\ndata: ${line}\n\n`);
      });

      tail.on("error", (err: Error) => {
        console.error("Error tailing file", err);
        res.write(`event: error\ndata: ${err.message}\n\n`);
      });

      req.on("close", () => {
        tail.unwatch();
      });
    } catch (err) {
      res.write(`event: error\ndata: ${(err as Error).message}\n\n`);
    }
  });

  readStream.on("error", (err: Error) => {
    res.write(`event: error\ndata: Error leyendo log: ${err.message}\n\n`);
  });

  req.on("close", () => {
    readStream.destroy();
  });
}
