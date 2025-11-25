"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProductById = deleteProductById;
async function deleteProductById(connection, id, schema_v) {
    const [result] = await connection.execute("DELETE FROM products WHERE id = ? AND schema_v = ?", [id, schema_v]);
    return result;
}
