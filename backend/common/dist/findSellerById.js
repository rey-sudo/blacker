"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSellerById = findSellerById;
async function findSellerById(connection, id) {
    const [rows] = await connection.execute(`SELECT * FROM sellers WHERE id = ? LIMIT 1`, [id]);
    return rows?.[0] || null;
}
