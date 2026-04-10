import { normalizeAnalysisText } from "./textNormalization.js";

const saudiPrioritySignals = [
  "saudi arabia",
  "riyadh",
  "jeddah",
  "dammam",
  "khobar",
  "dhahran",
  "makkah",
  "mecca",
  "medina",
  "madinah"
];

export function getSaudiPriorityScore(location: string, remoteType?: string) {
  const normalized = normalizeAnalysisText(`${location} ${remoteType ?? ""}`);

  if (saudiPrioritySignals.some((signal) => normalized.includes(signal))) {
    return 2;
  }

  if (normalized.includes("remote")) {
    return 1;
  }

  return 0;
}

export function getDiscoveryLocationSignal(preferredLocation?: string) {
  const normalized = normalizeAnalysisText(preferredLocation ?? "");

  if (!normalized) {
    return {
      preferredLocation: undefined,
      defaultSaudiBias: true
    };
  }

  return {
    preferredLocation: normalized,
    defaultSaudiBias: false
  };
}
