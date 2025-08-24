import path from "path";
import morgan from "morgan";
import helmet from "helmet";
import express from 'express';
import serveIndex from 'serve-index';
import { ipMiddleware } from "../middleware/ip.js";
import { root, SlaveBot } from "../index.js";
import { logger } from "../utils/logger.js";
import { getLogsHandler } from "../routes/get-logs.js";

export function startHttpServer(bot: SlaveBot) {

    const app = express();

    app.disable("x-powered-by");

    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    }));

    app.use(express.json());

    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

    const whitelist: string[] = process.env.IP_WHITELIST!.split(',');

    //app.use(ipMiddleware(whitelist));

    const botId = bot.state.id

    app.get(`/api/slave/${botId}/get-slave`, (req, res) => {
        res.json(bot.state);
    });

    app.get(`/api/slave/${botId}/get-logs`, getLogsHandler);

    const outputPath = path.join(root, 'output');
    app.use(`/api/slave/${botId}/output`, express.static(outputPath), serveIndex(outputPath, { icons: true }));

    app.get(`/api/slave/${botId}/health`, (req, res) => {
        res.status(200).send('Test OK');
    });

    app.use((req, res) => {
        res.status(404).send('Not Found');
    });

    app.listen(3000, () => {
        logger.info('📡 Server listening port 3000');
    });
}
