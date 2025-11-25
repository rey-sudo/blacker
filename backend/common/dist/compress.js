"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compress = compress;
const pako_1 = require("pako");
function compress(message) {
    const input = typeof message === "string" ? message : JSON.stringify(message);
    return Buffer.from((0, pako_1.gzip)(input)).toString("base64");
}
