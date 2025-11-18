import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cookieSession from "cookie-session";

const app = express();

const sessionOptions: object = {
  name: 'session',
  maxAge: 7 * 24 * 60 * 60 * 1000, 
  signed: false,
  secure: false,
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
};

app.set("trust proxy", 1);

app.use(helmet());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieSession(sessionOptions));

export { app };
