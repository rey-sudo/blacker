"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decompress = decompress;
const pako_1 = require("pako");
function decompress(value) {
    if (!value) {
        return null;
    }
    const buffer = Buffer.from(value, "base64");
    return new TextDecoder().decode((0, pako_1.ungzip)(buffer));
}
