import { Request, Response, NextFunction } from "express"
import { getAlerts } from "../common/alerts.js";
import { redisClient } from "../database/client.js";
import { format } from "timeago.js";

export const getAlertsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const alerts = await getAlerts(redisClient.client)

        const response = alerts.map((data) => {
            return {
                ...data,
                ago: format(data.timestamp)
            }
        })

        res.json({ success: true, message: 'ok', data: response });

    } catch (err) {
        next(err);
    }
}