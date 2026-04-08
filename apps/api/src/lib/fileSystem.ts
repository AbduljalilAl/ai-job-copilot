import fs from "node:fs/promises";

export async function safeDeleteFile(filePath?: string) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore cleanup failures. They should not block the main request flow.
  }
}
