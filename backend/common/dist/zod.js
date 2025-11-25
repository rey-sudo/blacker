"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usernameSchema = exports.passwordSchema = exports.emailSchema = exports.hexRegex = exports.usernameRegex = exports.passwordRegex = exports.emailRegex = void 0;
const zod_1 = require("zod");
exports.emailRegex = /^[^'"`\\\x00@\s]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
exports.passwordRegex = /^.{12,64}$/;
exports.usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
exports.hexRegex = /^(0x)?[a-fA-F0-9]+$/;
exports.emailSchema = zod_1.z
    .string()
    .max(254, "The email must not exceed 254 characters.")
    .regex(exports.emailRegex, "Enter a valid email (example@domain.com).")
    .refine((email) => {
    const [local] = email.split("@");
    return local && local.length <= 63;
}, { message: "The part before @ must not exceed 63 characters." });
exports.passwordSchema = zod_1.z
    .string()
    .min(12, "Must be at least 12 characters long.")
    .max(64, "Must not exceed 64 characters.")
    .regex(exports.passwordRegex, "Invalid password.");
exports.usernameSchema = zod_1.z.string().regex(exports.usernameRegex, {
    message: "Username must be 3–32 characters and use only letters, numbers, or underscores.",
});
