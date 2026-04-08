const phraseVariants: Array<[RegExp, string]> = [
  [/\bnode\s*js\b/g, "node.js"],
  [/\bnodejs\b/g, "node.js"],
  [/\bpostgres\b/g, "postgresql"],
  [/\bpostgre sql\b/g, "postgresql"],
  [/\bjs\b/g, "javascript"],
  [/\bts\b/g, "typescript"],
  [/\brestful api\b/g, "rest api"],
  [/\brestful apis\b/g, "rest api"]
];

export function normalizeAnalysisText(text: string) {
  let normalized = text.toLowerCase();

  for (const [pattern, replacement] of phraseVariants) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[^\w\s.+#]/g, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[|•]+/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}
