import { Request, Response } from "express";
import { InstrumentSchema } from "../common/types/instruments.js";
import { ApiError, ERROR_CODES } from "../common/errors.js";

export const createInstrumentMiddlewares: any = [];

export const createInstrumentHandler = async (req: Request, res: Response) => {
  let connection = null;

  try {
    const result = InstrumentSchema.safeParse(req.body);

    if (result.success) {
      console.log("Valid params:", result.data);
    } else {
      console.log("Validation error:");

      throw new ApiError(
        ERROR_CODES.BAD_USER_INPUT.http,
        "Invalid instrument params",
        ERROR_CODES.BAD_USER_INPUT.code,
        result.error.format(),
        true,
        true
      );
    }

    res.status(200).send({ success: true, data: result.data });
  } catch (err: any) {
    throw err;
  }
};
