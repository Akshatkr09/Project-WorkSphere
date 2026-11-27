import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler } from "express";

export const requestContext: RequestHandler = (req, res, next) => {
  req.requestId = req.header("x-request-id")?.slice(0, 100) || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found", requestId: req.requestId } });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const status = Number(error?.statusCode) || 500;
  const code = status >= 500 ? "INTERNAL_ERROR" : (error?.code || "REQUEST_ERROR");
  if (status >= 500) console.error({ requestId: req.requestId, error });
  res.status(status).json({
    error: {
      code,
      message: status >= 500 ? "An unexpected error occurred" : String(error.message || "Request failed"),
      requestId: req.requestId
    }
  });
};
