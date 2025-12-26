import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { logger } from "./logger.js";
import { ZodError } from "zod";

export const ERROR_CODES = {
  // 400 - Bad Request
  BAD_REQUEST: { http: 400, code: "BAD_REQUEST" },
  VALIDATION_ERROR: { http: 400, code: "VALIDATION_ERROR" },
  MISSING_FIELDS: { http: 400, code: "MISSING_FIELDS" },
  BAD_USER_INPUT: { http: 400, code: "BAD_USER_INPUT" },
  INVALID_FORMAT: { http: 400, code: "INVALID_FORMAT" },
  INVALID_PARAMETER: { http: 400, code: "INVALID_PARAMETER" },
  MALFORMED_REQUEST: { http: 400, code: "MALFORMED_REQUEST" },

  // 401 - Unauthorized
  UNAUTHORIZED: { http: 401, code: "UNAUTHORIZED" },
  INVALID_CREDENTIALS: { http: 401, code: "INVALID_CREDENTIALS" },
  INVALID_TOKEN: { http: 401, code: "INVALID_TOKEN" },
  TOKEN_EXPIRED: { http: 401, code: "TOKEN_EXPIRED" },
  INVALID_SIGNATURE: { http: 401, code: "INVALID_SIGNATURE" },
  AUTHENTICATION_REQUIRED: { http: 401, code: "AUTHENTICATION_REQUIRED" },
  SESSION_EXPIRED: { http: 401, code: "SESSION_EXPIRED" },

  // 403 - Forbidden
  FORBIDDEN: { http: 403, code: "FORBIDDEN" },
  INSUFFICIENT_PERMISSIONS: { http: 403, code: "INSUFFICIENT_PERMISSIONS" },
  OPERATION_NOT_PERMITTED: { http: 403, code: "OPERATION_NOT_PERMITTED" },
  ACTION_NOT_ALLOWED: { http: 403, code: "ACTION_NOT_ALLOWED" },
  ACCOUNT_SUSPENDED: { http: 403, code: "ACCOUNT_SUSPENDED" },
  ACCOUNT_BLOCKED: { http: 403, code: "ACCOUNT_BLOCKED" },
  UNVERIFIED_EMAIL: { http: 403, code: "UNVERIFIED_EMAIL" },
  UNVERIFIED_ACCOUNT: { http: 403, code: "UNVERIFIED_ACCOUNT" },
  RESOURCE_LOCKED: { http: 403, code: "RESOURCE_LOCKED" },
  ACCESS_DENIED: { http: 403, code: "ACCESS_DENIED" },
  IP_BLOCKED: { http: 403, code: "IP_BLOCKED" },

  // 404 - Not Found
  NOT_FOUND: { http: 404, code: "NOT_FOUND" },
  ROUTE_NOT_FOUND: { http: 404, code: "ROUTE_NOT_FOUND" },
  USER_NOT_FOUND: { http: 404, code: "USER_NOT_FOUND" },
  RESOURCE_NOT_FOUND: { http: 404, code: "RESOURCE_NOT_FOUND" },
  ENDPOINT_NOT_FOUND: { http: 404, code: "ENDPOINT_NOT_FOUND" },
  PAGE_NOT_FOUND: { http: 404, code: "PAGE_NOT_FOUND" },

  // 405 - Method Not Allowed
  METHOD_NOT_ALLOWED: { http: 405, code: "METHOD_NOT_ALLOWED" },

  // 406 - Not Acceptable
  NOT_ACCEPTABLE: { http: 406, code: "NOT_ACCEPTABLE" },

  // 408 - Request Timeout
  REQUEST_TIMEOUT: { http: 408, code: "REQUEST_TIMEOUT" },

  // 409 - Conflict
  CONFLICT: { http: 409, code: "CONFLICT" },
  RESOURCE_ALREADY_EXISTS: { http: 409, code: "RESOURCE_ALREADY_EXISTS" },
  EMAIL_ALREADY_VERIFIED: { http: 409, code: "EMAIL_ALREADY_VERIFIED" },
  UPDATE_CONFLICT: { http: 409, code: "UPDATE_CONFLICT" },
  DUPLICATE_OPERATION: { http: 409, code: "DUPLICATE_OPERATION" },
  DUPLICATE_ENTRY: { http: 409, code: "DUPLICATE_ENTRY" },
  USERNAME_TAKEN: { http: 409, code: "USERNAME_TAKEN" },
  EMAIL_ALREADY_EXISTS: { http: 409, code: "EMAIL_ALREADY_EXISTS" },

  // 410 - Gone
  RESOURCE_GONE: { http: 410, code: "RESOURCE_GONE" },

  // 413 - Payload Too Large
  PAYLOAD_TOO_LARGE: { http: 413, code: "PAYLOAD_TOO_LARGE" },
  FILE_TOO_LARGE: { http: 413, code: "FILE_TOO_LARGE" },

  // 415 - Unsupported Media Type
  UNSUPPORTED_MEDIA_TYPE: { http: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
  INVALID_FILE_TYPE: { http: 415, code: "INVALID_FILE_TYPE" },

  // 422 - Unprocessable Entity
  UNPROCESSABLE_ENTITY: { http: 422, code: "UNPROCESSABLE_ENTITY" },
  VERIFICATION_FAILED: { http: 422, code: "VERIFICATION_FAILED" },
  BUSINESS_LOGIC_ERROR: { http: 422, code: "BUSINESS_LOGIC_ERROR" },
  INVALID_STATE: { http: 422, code: "INVALID_STATE" },

  // 423 - Locked
  RESOURCE_CURRENTLY_LOCKED: { http: 423, code: "RESOURCE_CURRENTLY_LOCKED" },

  // 429 - Too Many Requests
  RATE_LIMIT_EXCEEDED: { http: 429, code: "RATE_LIMIT_EXCEEDED" },
  TOO_MANY_REQUESTS: { http: 429, code: "TOO_MANY_REQUESTS" },
  QUOTA_EXCEEDED: { http: 429, code: "QUOTA_EXCEEDED" },

  // 451 - Unavailable For Legal Reasons
  UNAVAILABLE_FOR_LEGAL_REASONS: {
    http: 451,
    code: "UNAVAILABLE_FOR_LEGAL_REASONS",
  },

  // 500 - Internal Server Error
  INTERNAL_ERROR: { http: 500, code: "INTERNAL_ERROR" },
  INTERNAL_SERVER_ERROR: { http: 500, code: "INTERNAL_SERVER_ERROR" },
  UNEXPECTED_ERROR: { http: 500, code: "UNEXPECTED_ERROR" },
  DATABASE_ERROR: { http: 500, code: "DATABASE_ERROR" },
  CACHE_ERROR: { http: 500, code: "CACHE_ERROR" },
  CONFIGURATION_ERROR: { http: 500, code: "CONFIGURATION_ERROR" },

  // 501 - Not Implemented
  NOT_IMPLEMENTED: { http: 501, code: "NOT_IMPLEMENTED" },
  FEATURE_NOT_AVAILABLE: { http: 501, code: "FEATURE_NOT_AVAILABLE" },

  // 502 - Bad Gateway
  BAD_GATEWAY: { http: 502, code: "BAD_GATEWAY" },
  UPSTREAM_ERROR: { http: 502, code: "UPSTREAM_ERROR" },

  // 503 - Service Unavailable
  SERVICE_UNAVAILABLE: { http: 503, code: "SERVICE_UNAVAILABLE" },
  MAINTENANCE_MODE: { http: 503, code: "MAINTENANCE_MODE" },
  DEPENDENCY_FAILURE: { http: 503, code: "DEPENDENCY_FAILURE" },
  EMAIL_DELIVERY_ERROR: { http: 503, code: "EMAIL_DELIVERY_ERROR" },
  EXTERNAL_SERVICE_ERROR: { http: 503, code: "EXTERNAL_SERVICE_ERROR" },

  // 504 - Gateway Timeout
  GATEWAY_TIMEOUT: { http: 504, code: "GATEWAY_TIMEOUT" },
  TIMEOUT_ERROR: { http: 504, code: "TIMEOUT_ERROR" },
  UPSTREAM_TIMEOUT: { http: 504, code: "UPSTREAM_TIMEOUT" },

  // 507 - Insufficient Storage
  INSUFFICIENT_STORAGE: { http: 507, code: "INSUFFICIENT_STORAGE" },

  // Business Logic Errors (422)
  INSUFFICIENT_FUNDS: { http: 422, code: "INSUFFICIENT_FUNDS" },
  INSUFFICIENT_BALANCE: { http: 422, code: "INSUFFICIENT_BALANCE" },
  LIMIT_EXCEEDED: { http: 422, code: "LIMIT_EXCEEDED" },
  INVALID_OPERATION: { http: 422, code: "INVALID_OPERATION" },
  PRECONDITION_FAILED: { http: 422, code: "PRECONDITION_FAILED" },
} as const;


export type ErrorCode = keyof typeof ERROR_CODES;

export type ErrorInfo = (typeof ERROR_CODES)[ErrorCode];

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
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly isOperational: boolean = true,
    public readonly exposeDetails: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace?.(this, ApiError);
  }
}

const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(
      ERROR_CODES.VALIDATION_ERROR.http,
      "Validation error",
      ERROR_CODES.VALIDATION_ERROR.code,
      err.flatten(),
      true,
      true
    );
  }

  return new ApiError(
    ERROR_CODES.INTERNAL_ERROR.http,
    "Internal server error",
    ERROR_CODES.INTERNAL_ERROR.code,
    undefined,
    false,
    false
  );
};

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const normalized = normalizeError(err);

  if (normalized.isOperational) {
    logger.warn({
      message: "Operational error",
      error: normalized,
      stack: normalized.stack,
    });
  } else {
    logger.error({
      message: "Non-operational error",
      error: normalized,
      stack: normalized.stack,
    });
  }

  res.setHeader("Cache-Control", "no-store");

  const response: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  } = {
    status: normalized.statusCode,
    code: normalized.code,
    message: normalized.isOperational
      ? normalized.message
      : "Internal server error",
  };

  if (normalized.exposeDetails && normalized.details !== undefined) {
    response.details = normalized.details;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = normalized.stack;
  }

  res.status(normalized.statusCode).json(response);
};
