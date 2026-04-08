import fs from "node:fs/promises";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export class TextExtractionService {
  async extractFromFile(filePath: string, mimeType: string) {
    const buffer = await fs.readFile(filePath);

    if (mimeType === "application/pdf") {
      const result = await pdfParse(buffer);
      return this.normalizeText(result.text);
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      return this.normalizeText(result.value);
    }

    throw new Error("Unsupported file type.");
  }

  normalizeText(text: string) {
    return text.replace(/\s+/g, " ").trim();
  }
}

