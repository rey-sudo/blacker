import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cookieParser from 'cookie-parser';

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use(cookieParser());

export { app };
