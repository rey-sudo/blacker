import { Request, Response, NextFunction } from "express";
import { formatSlaveData } from "../utils/format.js";
import { findAllSlaves } from "../utils/findAllSlaves.js";
import database from "../database/client.js";

export const getSlavesHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let connection = null

    try {
        connection = await database.client.getConnection()

        const slaves = await findAllSlaves(connection)

        const response = []

        for (const slave of slaves) {
            const live = true

            const images = [
                `https://picsum.photos/id/545/400/600`,
                `https://picsum.photos/id/343/400/600`,
                `https://picsum.photos/id/323/400/600`
            ]

            response.push(formatSlaveData(slave, live, images))
        }

        res.json({ success: true, message: 'ok', data: response });

    } catch (error) {
        next(error);
    } finally {
        connection?.release?.();
    }
}



