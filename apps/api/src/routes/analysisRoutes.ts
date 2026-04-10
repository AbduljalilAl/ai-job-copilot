import { Router } from "express";
import {
  deleteAllAnalyses,
  deleteAnalysisById,
  getAnalysisById,
  getAnalysisHistory,
  updateAnalysisNotes,
  updateAnalysisStatus
} from "../controllers/jobController.js";

export const analysisRouter = Router();

analysisRouter.get("/history", getAnalysisHistory);
analysisRouter.delete("/history", deleteAllAnalyses);
analysisRouter.get("/:id", getAnalysisById);
analysisRouter.patch("/:id/status", updateAnalysisStatus);
analysisRouter.patch("/:id/notes", updateAnalysisNotes);
analysisRouter.delete("/:id", deleteAnalysisById);
