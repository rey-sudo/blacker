"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBookById = findBookById;
async function findBookById(connection, id) {
    const [rows] = await connection.execute(`SELECT * FROM books WHERE id = ?`, [id]);
    return rows?.[0] || null;
}
