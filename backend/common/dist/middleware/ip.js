"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipMiddleware = ipMiddleware;
const request_ip_1 = __importDefault(require("request-ip"));
function ipMiddleware(whitelist) {
    return (req, res, next) => {
        const clientIP = request_ip_1.default.getClientIp(req);
        console.log("IP:", clientIP);
        if (!clientIP || !whitelist.includes(clientIP)) {
            return res.status(403).send("Access denied");
        }
        next();
    };
}
