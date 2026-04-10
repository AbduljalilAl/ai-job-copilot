import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") {
      response.status(500).json({
        error: {
          code: "DATABASE_SCHEMA_OUT_OF_DATE",
          message: "Database schema is out of date. Run Prisma generate and migrate, then restart the API."
        }
      });
      return;
    }
  }

  if (error instanceof Error) {
    console.error(error);
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error."
    }
  });
}
