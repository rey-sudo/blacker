import { Request, Response, NextFunction } from "express"
import { getAlerts } from "../common/alerts.js";
import { redisClient } from "../database/client.js";

export const getAlertsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const response = await getAlerts(redisClient.client)
        
        res.json({ success: true, message: 'ok', data: response });

    } catch (err) {
        next(err);
    } 
}