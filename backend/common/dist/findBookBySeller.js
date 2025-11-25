"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBookBySeller = findBookBySeller;
async function findBookBySeller(connection, id, sellerId) {
    const [rows] = await connection.execute(`SELECT * FROM books WHERE id = ? AND seller_id = ? LIMIT 1`, [id, sellerId]);
    return rows?.[0] || null;
}
