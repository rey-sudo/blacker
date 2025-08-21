import { Request, Response, NextFunction } from "express";
import { formatSlaveData } from "../utils/format";

export const getSlavesHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    try {
        const botScheme = {
            "id": "slave-0",
            "iteration": 2,
            "description": "description text",
            "paused": false,
            "status": "started",
            "symbol": "BTCUSDT",
            "symbol_info": null,
            "executed": 0,
            "finished": 0,
            "leverage": 5,
            "stop_loss": "0.97",
            "order_amount": 500,
            "margin_type": "ISOLATED",
            "created_at": 1755732627759,
            "updated_at": 1755733008739,
            "rule_labels": [
                "rsi",
                "squeeze",
                "adx",
                "heikin"
            ],
            "rule_values": [false, false, false, false]
        }

        const live = true

        const images = [
            `https://picsum.photos/id/545/400/600`,
            `https://picsum.photos/id/343/400/600`,
            `https://picsum.photos/id/323/400/600`
        ]

        const scheme = [
            formatSlaveData(botScheme, live, images)
        ]

        res.json({ success: true, message: 'ok', data: scheme });
      
    } catch (error) {
        next(error);
    }
}



