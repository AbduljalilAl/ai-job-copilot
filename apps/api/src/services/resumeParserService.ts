import mammoth from "mammoth";
import fs from "node:fs/promises";
import pdfParse from "pdf-parse";
import { AppError } from "../lib/errors.js";
import { normalizeExtractedText } from "../lib/textNormalization.js";

export class ResumeParserService {
  async parseFile(filePath: string, mimeType: string) {
    const buffer = await fs.readFile(filePath);

    try {
      if (mimeType === "application/pdf") {
        const result = await pdfParse(buffer);
        return normalizeExtractedText(result.text);
      }

      if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer });
        return normalizeExtractedText(result.value);
      }
    } catch {
      throw new AppError({
        code: "RESUME_PARSE_FAILED",
        message: "We could not extract text from that resume file. Try another PDF or DOCX export.",
        statusCode: 422
      });
    }

    throw new AppError({
      code: "INVALID_FILE_TYPE",
      message: "Only PDF and DOCX resumes are supported.",
      statusCode: 415
    });
  }
}
