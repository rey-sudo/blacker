"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const async_retry_1 = __importDefault(require("async-retry"));
function withRetry(fn) {
    return (0, async_retry_1.default)(fn, { retries: 3, minTimeout: 1000, factor: 1.5 });
}
