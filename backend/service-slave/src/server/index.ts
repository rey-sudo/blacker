import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import express from 'express';
import serveIndex from 'serve-index';
import { root, SlaveBot } from "../index.js";
import { logger } from "@whiterockdev/common";
import { getLogsHandler } from "../routes/get-logs.js";

export function startHttpServer(bot: SlaveBot) {

    const app = express();

    app.disable("x-powered-by");

    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    }));

    app.use(express.json());

    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

    const botId = bot.state.id

    app.get(`/api/slave/${botId}/get-slave`, (req, res) => {
        res.json(bot.state);
    });

    app.get(`/api/slave/${botId}/get-logs`, getLogsHandler);

    const outputPath = path.join(root, 'output');
    app.use(`/api/slave/${botId}/output`, express.static(outputPath), serveIndex(outputPath, { icons: true }));

    app.get(`/api/slave/${botId}/health`, (req, res) => {
        res.status(200).json({
            success: true,
            message: "test OK"
        });
    });

    app.use((req, res) => {
        res.status(404).send('Not Found');
    });

    app.listen(8002, () => {
        logger.info('📡 Server listening port 8002');
    });
}
