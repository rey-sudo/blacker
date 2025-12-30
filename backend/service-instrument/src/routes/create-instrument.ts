import { Request, Response } from "express";
import { ApiError, ERROR_CODES } from "../common/errors.js";
import {
  CreateInstrumentSchema,
  InstrumentCryptoSpotSchema,
} from "../common/types/instruments/index.js";

export const createInstrumentMiddlewares: any = [];

export const createInstrumentHandler = async (req: Request, res: Response) => {
  try {
    const result = CreateInstrumentSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(
        ERROR_CODES.BAD_USER_INPUT.http,
        "Invalid instrument params",
        ERROR_CODES.BAD_USER_INPUT.code,
        result.error.format(),
        true,
        true
      );
    }

    const instrumentData = result.data;

    switch (instrumentData.type) {
      case "crypto-spot":
        const instrument = InstrumentCryptoSpotSchema.parse(instrumentData);

        console.log(instrument);

        break;

      default:
        throw new ApiError(
          ERROR_CODES.BAD_USER_INPUT.http,
          "Invalid instrument params. Invalid type.",
          ERROR_CODES.BAD_USER_INPUT.code,
          undefined,
          true,
          true
        );
    }

    res.status(200).send({ success: true, data: result.data });
  } catch (err: any) {
    throw err;
  }
};
