"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRSA = generateRSA;
const node_forge_1 = __importDefault(require("node-forge"));
function generateRSA() {
    return new Promise((resolve, reject) => {
        node_forge_1.default.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
            if (err)
                return reject(err);
            const privateKeyPem = node_forge_1.default.pki.privateKeyToPem(keypair.privateKey);
            const publicKeyPem = node_forge_1.default.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyB64 = Buffer.from(privateKeyPem).toString("base64");
            const publicKeyB64 = Buffer.from(publicKeyPem).toString("base64");
            resolve({ privateKeyB64, publicKeyB64 });
        });
    });
}
