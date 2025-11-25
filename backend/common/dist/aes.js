"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptAESGCM = encryptAESGCM;
exports.decryptAESGCM = decryptAESGCM;
// crypto-aes-gcm-node.ts
// ------------------------------------------------------------
//  Dependencies and WebCrypto alias for Node
// ------------------------------------------------------------
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const crypto = node_crypto_1.webcrypto; // Native Web Crypto in Node
const encoder = new node_util_1.TextEncoder();
const decoder = new node_util_1.TextDecoder();
// ------------------------------------------------------------
//  Base64 Utilities  (Uint8Array <-> base64)
// ------------------------------------------------------------
function uint8ToBase64(data) {
    return Buffer.from(data).toString("base64");
}
function base64ToUint8(b64) {
    return Buffer.from(b64, "base64");
}
// ------------------------------------------------------------
//  Security parameters
// ------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256; // 32 bytes
const IV_LENGTH = 12; // 12 bytes (96 bits, GCM standard)
const SALT_LENGTH = 16; // 16 bytes
// ------------------------------------------------------------
//  Key derivation (PBKDF2-HMAC-SHA-256)
// ------------------------------------------------------------
async function deriveKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
    }, keyMaterial, { name: "AES-GCM", length: KEY_LENGTH_BITS }, false, ["encrypt", "decrypt"]);
}
// ------------------------------------------------------------
//  Encryption
// ------------------------------------------------------------
async function encryptAESGCM(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(password, salt);
    const ciphertextBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
    return {
        salt: uint8ToBase64(salt),
        iv: uint8ToBase64(iv),
        authTag: uint8ToBase64(new Uint8Array(ciphertextBuf.slice(-16))),
        ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuf)),
    };
}
// ------------------------------------------------------------
//  Decryption
// ------------------------------------------------------------
async function decryptAESGCM(encrypted, password) {
    const salt = base64ToUint8(encrypted.salt); // 16 bytes
    const iv = base64ToUint8(encrypted.iv); // 12 bytes
    const ciphertext = base64ToUint8(encrypted.ciphertext); // n bytes
    if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV: expected ${IV_LENGTH} bytes`);
    }
    if (salt.length !== SALT_LENGTH) {
        throw new Error(`Invalid salt: expected ${SALT_LENGTH} bytes`);
    }
    const key = await deriveKey(password, salt);
    const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return decoder.decode(plaintextBuf);
}
