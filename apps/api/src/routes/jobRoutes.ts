import { Router } from "express";
import { analyzeJob } from "../controllers/jobController.js";

export const jobRouter = Router();

jobRouter.post("/analyze", analyzeJob);

