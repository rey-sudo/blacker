"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
if (!fs_1.default.existsSync("./output")) {
    fs_1.default.mkdirSync("./output");
}
exports.logger = (0, pino_1.default)({
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
