"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertBook = insertBook;
async function insertBook(connection, scheme) {
    const columns = Object.keys(scheme);
    const values = Object.values(scheme);
    const sql = `
    INSERT INTO books (${columns.join(", ")})
    VALUES (${columns.map(() => "?").join(", ")})
  `;
    return await connection.execute(sql, values);
}
