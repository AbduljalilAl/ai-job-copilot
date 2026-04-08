import OpenAI from "openai";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export interface AIGenerationResult {
  coverLetter: string;
  applicationTips: string;
  aiAssistanceStatus: "available" | "error";
  aiAssistanceMessage?: string;
}

export class AIService {
  private readonly client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  private readonly model = env.OPENAI_MODEL;

  async generateCoverLetter(resumeText: string, jobText: string) {
    const { trimmedJobText, trimmedResumeText } = this.validateInputs(resumeText, jobText);

    return this.runTextPrompt(
      [
        "You are helping write a short cover letter for an internship or summer training application.",
        "",
        "Write a concise cover letter using only the candidate's resume and the target job description.",
        "",
        "Rules:",
        "- Use only information supported by the resume",
        "- Do not invent achievements, tools, projects, grades, certifications, or experience",
        "- Keep the tone professional and natural for a student or early-career applicant",
        "- Make it specific to the job description",
        "- If supported by the resume and relevant to the job, mention 2 to 3 specific skills or technologies",
        "- Keep it around 150 to 220 words",
        "- Return only the cover letter text",
        "",
        "Resume:",
        trimmedResumeText,
        "",
        "Job Description:",
        trimmedJobText
      ].join("\n"),
      "cover letter",
      "OpenAI cover letter generation failed."
    );
  }

  async generateApplicationTips(resumeText: string, jobText: string) {
    const { trimmedJobText, trimmedResumeText } = this.validateInputs(resumeText, jobText);

    return this.runTextPrompt(
      [
        "You are helping a student improve a job or summer training application.",
        "",
        "Based only on the resume and job description, provide short practical guidance.",
        "",
        "Rules:",
        "- Do not rewrite the resume",
        "- Do not invent missing experience",
        "- Focus on what to emphasize, relevant strengths, and possible gaps",
        "- Keep it concise and useful",
        "- Return 3 to 5 short bullet points",
        "",
        "Resume:",
        trimmedResumeText,
        "",
        "Job Description:",
        trimmedJobText
      ].join("\n"),
      "application tips",
      "OpenAI application tips generation failed."
    );
  }

  async generateGroundedOutputs(resumeText: string, jobText: string): Promise<AIGenerationResult> {
    const { trimmedJobText, trimmedResumeText } = this.validateInputs(resumeText, jobText);

    console.info("OpenAI assistance request", {
      hasApiKey: Boolean(env.OPENAI_API_KEY),
      hasJobText: trimmedJobText.length > 0,
      hasResumeText: trimmedResumeText.length > 0,
      model: this.model
    });

    if (!this.client) {
      return {
        coverLetter: "",
        applicationTips: "",
        aiAssistanceStatus: "error",
        aiAssistanceMessage: "OpenAI is not configured. Add OPENAI_API_KEY in your local .env file."
      };
    }

    try {
      const [coverLetter, applicationTips] = await Promise.all([
        this.generateCoverLetter(trimmedResumeText, trimmedJobText),
        this.generateApplicationTips(trimmedResumeText, trimmedJobText)
      ]);

      return {
        coverLetter,
        applicationTips,
        aiAssistanceStatus: "available"
      };
    } catch (error) {
      console.error("OpenAI assistance failed", {
        error: error instanceof Error ? error.message : String(error),
        hasJobText: trimmedJobText.length > 0,
        hasResumeText: trimmedResumeText.length > 0,
        model: this.model
      });

      return {
        coverLetter: "",
        applicationTips: "",
        aiAssistanceStatus: "error",
        aiAssistanceMessage: "OpenAI could not generate the cover letter or application tips. The rest of the analysis is still available."
      };
    }
  }

  private validateInputs(resumeText: string, jobText: string) {
    const trimmedResumeText = resumeText.trim();
    const trimmedJobText = jobText.trim();

    if (!trimmedResumeText) {
      throw new AppError({
        code: "MISSING_RESUME_TEXT",
        message: "Resume text is missing. Upload a valid resume before requesting AI assistance.",
        statusCode: 400
      });
    }

    if (!trimmedJobText) {
      throw new AppError({
        code: "MISSING_JOB_TEXT",
        message: "Job description text is required before requesting AI assistance.",
        statusCode: 400
      });
    }

    return {
      trimmedResumeText,
      trimmedJobText
    };
  }

  private async runTextPrompt(prompt: string, feature: string, errorMessage: string) {
    if (!this.client) {
      throw new AppError({
        code: "OPENAI_API_KEY_MISSING",
        message: "OpenAI is not configured. Add OPENAI_API_KEY in your local .env file.",
        statusCode: 503
      });
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: prompt
      });

      const output = response.output_text.trim();

      if (!output) {
        throw new Error(`OpenAI returned an empty ${feature} response.`);
      }

      return output;
    } catch (error) {
      console.error(errorMessage, {
        error: error instanceof Error ? error.message : String(error),
        feature,
        model: this.model
      });
      throw error;
    }
  }
}
