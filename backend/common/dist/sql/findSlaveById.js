"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSlaveById = findSlaveById;
async function findSlaveById(connection, id) {
    const [rows] = await connection.execute(`SELECT * FROM slaves WHERE id = ?`, [id]);
    return rows?.[0] || null;
}
