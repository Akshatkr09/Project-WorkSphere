import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
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
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })),
        requestId: req.requestId
      }
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "A record with these details already exists", requestId: req.requestId } });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested record was not found", requestId: req.requestId } });
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return res.status(400).json({ error: { code: "INVALID_REFERENCE", message: "The request references an invalid related record", requestId: req.requestId } });
    }
  }

  const status = Number(error?.statusCode) || 500;
  const code = status >= 500 ? "INTERNAL_ERROR" : (error?.code || "REQUEST_ERROR");
  if (status >= 500) console.error({ requestId: req.requestId, error });
  return res.status(status).json({
    error: {
      code,
      message: status >= 500 ? "An unexpected error occurred" : String(error.message || "Request failed"),
      requestId: req.requestId
    }
  });
};
