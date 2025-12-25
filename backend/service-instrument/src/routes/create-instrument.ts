import { Request, Response } from "express";

export const createInstrumentMiddlewares: any = [];

export const createInstrumentHandler = async (req: Request, res: Response) => {
  let connection = null;

  try {
    console.log(req.body);

    res.status(200).send({ success: true, data: {} });
  } catch (err: any) {
    throw err;
  } 
};
