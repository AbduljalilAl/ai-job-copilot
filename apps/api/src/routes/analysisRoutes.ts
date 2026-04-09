import { Router } from "express";
import { getAnalysisById, getAnalysisHistory, updateAnalysisNotes, updateAnalysisStatus } from "../controllers/jobController.js";

export const analysisRouter = Router();

analysisRouter.get("/history", getAnalysisHistory);
analysisRouter.get("/:id", getAnalysisById);
analysisRouter.patch("/:id/status", updateAnalysisStatus);
analysisRouter.patch("/:id/notes", updateAnalysisNotes);
