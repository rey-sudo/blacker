"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSlave = void 0;
/**Update model without data verification without error handling */
const updateSlave = async (connection, id, data) => {
    const fields = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");
    const query = `
    UPDATE slaves
    SET ${fields}
    WHERE id = ?
    `;
    const values = [...Object.values(data), id];
    const [result] = await connection.execute(query, values);
    if ('affectedRows' in result && result.affectedRows !== 1) {
        throw new Error('Error updating the slave');
    }
    return result;
};
exports.updateSlave = updateSlave;
