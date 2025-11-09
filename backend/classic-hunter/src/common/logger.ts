import pino from "pino";
import fs from "fs";

if (!fs.existsSync("./logs")) {
  fs.mkdirSync("./logs");
}

export const logger = pino({
  level: "info", 
  transport: {
    targets: [
      {
        target: "pino/file", 
        options: { destination: "./logs/app.log" },
      },
      {
        target: "pino-pretty", 
        options: { colorize: true },
      },
    ],
  },
});
