import pino from "pino";
import fs from "fs";

if (!fs.existsSync("./output")) {
  fs.mkdirSync("./output");
}

export const logger = pino({
  level: "info", 
  transport: {
    targets: [
      {
        target: "pino/file", 
        options: { destination: "./output/app.log" },
      },
      {
        target: "pino-pretty", 
        options: { colorize: true },
      },
    ],
  },
});
