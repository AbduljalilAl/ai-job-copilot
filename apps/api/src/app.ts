import cors from "cors";
import express from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { jobRouter } from "./routes/jobRoutes.js";
import { resumeRouter } from "./routes/resumeRoutes.js";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/resume", resumeRouter);
app.use("/job", jobRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON."
      }
    });
    return;
  }

  if (error instanceof MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({
      error: {
        code: "FILE_TOO_LARGE",
        message: "Resume file is too large. The maximum upload size is 5 MB."
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.issues.map((issue) => issue.message)
      }
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  next(error);
});

app.use(errorHandler);
