import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.js";

export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  MISSING_FIELDS: "MISSING_FIELDS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  UPDATE_CONFLICT: "UPDATE_CONFLICT",
  UNVERIFIED_EMAIL: "UNVERIFIED_EMAIL",
  EMAIL_ALREADY_VERIFIED: "EMAIL_ALREADY_VERIFIED",
  BAD_USER_INPUT: "BAD_USER_INPUT",

  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  CACHE_ERROR: "CACHE_ERROR",
  EMAIL_DELIVERY_ERROR: "EMAIL_DELIVERY_ERROR",
  DEPENDENCY_FAILURE: "DEPENDENCY_FAILURE",

  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  OPERATION_NOT_PERMITTED: "OPERATION_NOT_PERMITTED",
  ACTION_NOT_ALLOWED: "ACTION_NOT_ALLOWED",
  DUPLICATE_OPERATION: "DUPLICATE_OPERATION",
  RESOURCE_LOCKED: "RESOURCE_LOCKED",
};

export const ERROR_EVENTS = [
  "exit",
  "SIGINT",
  "SIGTERM",
  "SIGQUIT",
  "uncaughtException",
  "unhandledRejection",
  "SIGHUP",
  "SIGCONT",
];

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options?: { code?: string; details?: unknown; isOperational?: boolean }
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = options?.code || ERROR_CODES.INTERNAL_ERROR;
    this.isOperational = options?.isOperational ?? true;

    if (options?.code === ERROR_CODES.VALIDATION_ERROR) {
      this.details = options.details;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(400, "Validation error", {
      code: ERROR_CODES.VALIDATION_ERROR,
      details: err.flatten(),
      isOperational: true,
    });
  }

  if (err instanceof Error) {
    return new ApiError(500, "Internal server error", {
      code: ERROR_CODES.INTERNAL_ERROR,
      isOperational: false,
    });
  }

  return new ApiError(500, "Unknown internal error", {
    code: ERROR_CODES.INTERNAL_ERROR,
    isOperational: false,
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err);

  const normalized = normalizeError(err);

  res.setHeader("Content-Type", "application/json");

  const errorResponse = {
    status: normalized.statusCode,
    message: normalized.isOperational
      ? normalized.message
      : "Internal server error",
    code: normalized.code,
    details:
      normalized.code === ERROR_CODES.VALIDATION_ERROR
        ? normalized.details
        : null,
  };

  logger.error(errorResponse);

  res.status(normalized.statusCode).json(errorResponse);
};
