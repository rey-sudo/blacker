"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
const uuid_1 = require("uuid");
function generateId(prefix) {
    const id = (0, uuid_1.v7)();
    return prefix ? `${prefix}-${id}` : id;
}
