import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../lib/api-error.js";
import { logger } from "../config/logger.js";

function zodToDetails(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "root";
    details[key] = issue.message;
  }
  return details;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Rota não encontrada",
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
      details: zodToDetails(err),
    });
    return;
  }

  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
    },
    "Unhandled error",
  );

  res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Erro interno do servidor",
  });
}
