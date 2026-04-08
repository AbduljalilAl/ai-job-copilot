import { Router } from "express";
import { uploadResume } from "../controllers/resumeController.js";
import { upload } from "../middleware/upload.js";

export const resumeRouter = Router();

resumeRouter.post("/upload", upload.single("resume"), uploadResume);

