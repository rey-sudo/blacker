import { Request, Response, NextFunction } from "express";

export const healthHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    try {

        res.json({ success: true, message: 'ok', data: {} });
      
    } catch (error) {
        next(error);
    }
}



