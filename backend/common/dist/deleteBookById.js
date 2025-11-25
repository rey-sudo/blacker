"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBookById = deleteBookById;
async function deleteBookById(connection, id) {
    const [result] = await connection.execute("DELETE FROM books WHERE id = ?", [id]);
    return result;
}
