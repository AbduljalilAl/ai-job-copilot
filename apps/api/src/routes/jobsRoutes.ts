import { Router } from "express";
import { getJobById, getJobs, searchJobs } from "../controllers/jobsController.js";

export const jobsRouter = Router();

jobsRouter.post("/search", searchJobs);
jobsRouter.get("/", getJobs);
jobsRouter.get("/:id", getJobById);
