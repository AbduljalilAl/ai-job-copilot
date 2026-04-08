import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { env } from "./config/env.js";
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
  if (error instanceof ZodError) {
    response.status(400).json({
      message: error.issues.map((issue) => issue.message).join(", ")
    });
    return;
  }

  next(error);
});

app.use(errorHandler);

