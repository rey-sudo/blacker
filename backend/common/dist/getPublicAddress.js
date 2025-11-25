"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAddress = void 0;
const index_js_1 = require("./index.js");
const request_ip_1 = __importDefault(require("request-ip"));
const getPublicAddress = (req, res, next) => {
    let ip = request_ip_1.default.getClientIp(req);
    if (!ip) {
        index_js_1.logger.warn({
            message: 'Public IP not detected',
            event: 'operational',
            service: req.originalUrl,
            method: req.method
        });
        res.status(403).json({ error: 'Public IP not detected' });
        return;
    }
    const cleanedIp = ip.replace(/^::ffff:/, '');
    req.publicAddress = cleanedIp;
    index_js_1.logger.info({
        message: 'Public IP detected',
        event: 'operational',
        service: req.originalUrl,
        method: req.method,
        ip: cleanedIp
    });
    next();
};
exports.getPublicAddress = getPublicAddress;
