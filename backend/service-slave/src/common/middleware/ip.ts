import { Request, Response, NextFunction } from "express";
import requestIp from "request-ip";

export function ipMiddleware(whitelist: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = requestIp.getClientIp(req);

    console.log("IP:", clientIP);

    if (!clientIP || !whitelist.includes(clientIP)) {
      return res.status(403).send("Access denied");
    }

    next();
  };
}
