import { Request, Response } from "express";

export const currentUserMiddlewares: any = [];

export const currentUserHandler = async (req: Request, res: Response) => {
  let connection = null;

  try {
    res.status(200).send({ success: true, data: {} });
  } catch (err: any) {
    throw err;
  } finally {
  }
};
