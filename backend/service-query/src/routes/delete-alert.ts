import { Request, Response, NextFunction } from "express";
import { deleteAlert } from "../common/alerts.js";
import { redisClient } from "../database/client.js";

export const deleteAlertHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing alert ID",
      });
    }

    const deleted = await deleteAlert(redisClient.client, id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
