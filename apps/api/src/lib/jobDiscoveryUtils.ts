import { normalizeAnalysisText } from "./textNormalization.js";
import type { WorkMode } from "@ai-job-copilot/shared";

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

const countryAliasMap: Record<string, string[]> = {
  "saudi arabia": ["saudi arabia", "ksa", "riyadh", "jeddah", "dammam", "khobar", "dhahran", "makkah", "mecca", "medina", "madinah"],
  "united arab emirates": ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah"],
  "qatar": ["qatar", "doha"],
  "kuwait": ["kuwait", "kuwait city"],
  "bahrain": ["bahrain", "manama"],
  "oman": ["oman", "muscat"],
  "egypt": ["egypt", "cairo", "alexandria"],
  "jordan": ["jordan", "amman"],
  "united kingdom": ["united kingdom", "uk", "england", "london", "manchester"],
  "germany": ["germany", "berlin", "munich", "hamburg"],
  "netherlands": ["netherlands", "amsterdam", "rotterdam", "eindhoven"],
  "ireland": ["ireland", "dublin", "cork"],
  "canada": ["canada", "toronto", "vancouver", "montreal"],
  "united states": ["united states", "usa", "us", "new york", "san francisco", "seattle", "austin", "boston"],
  "remote global": ["remote", "global", "worldwide", "anywhere"]
};

const countryLabelMap: Record<string, string> = {
  "saudi arabia": "Saudi Arabia",
  "united arab emirates": "United Arab Emirates",
  "qatar": "Qatar",
  "kuwait": "Kuwait",
  "bahrain": "Bahrain",
  "oman": "Oman",
  "egypt": "Egypt",
  "jordan": "Jordan",
  "united kingdom": "United Kingdom",
  "germany": "Germany",
  "netherlands": "Netherlands",
  "ireland": "Ireland",
  "canada": "Canada",
  "united states": "United States",
  "remote global": "Remote / Global"
};

const remoteSignals = ["remote", "worldwide", "anywhere", "distributed", "work from home", "home based", "home-based", "global"];
const hybridSignals = ["hybrid", "flexible", "part remote", "partly remote"];
const onsiteSignals = ["onsite", "on site", "in office", "in-office", "office based", "office-based"];

function escapeForPattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsNormalizedAlias(normalizedText: string, alias: string) {
  return new RegExp(`(?:^| )${escapeForPattern(alias)}(?:$| )`).test(normalizedText);
}

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

export function inferWorkModeFromText(text: string): WorkMode | undefined {
  const normalized = normalizeAnalysisText(text);

  if (remoteSignals.some((signal) => containsNormalizedAlias(normalized, signal))) {
    return "remote";
  }

  if (hybridSignals.some((signal) => containsNormalizedAlias(normalized, signal))) {
    return "hybrid";
  }

  if (onsiteSignals.some((signal) => containsNormalizedAlias(normalized, signal))) {
    return "onsite";
  }

  return undefined;
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

export function normalizeLocationLookupKey(location?: string) {
  const normalizedLocation = normalizeAnalysisText(location ?? "");
  return normalizedLocation || undefined;
}

export function getCountryAliases(country?: string) {
  const normalizedCountry = normalizeCountryKey(country);

  if (!normalizedCountry) {
    return [];
  }

  return countryAliasMap[normalizedCountry] ?? [normalizedCountry];
}

export function normalizeCountryKey(country?: string) {
  const normalizedCountry = normalizeAnalysisText(country ?? "");

  if (!normalizedCountry) {
    return undefined;
  }

  return normalizedCountry;
}

export function isRemoteGlobalCountry(country?: string) {
  return normalizeCountryKey(country) === "remote global";
}

export function getCountryLabel(country?: string) {
  const key = normalizeCountryKey(country);

  if (!key) {
    return undefined;
  }

  return countryLabelMap[key] ?? country;
}

export function inferCountryFromText(text: string) {
  const normalizedText = normalizeAnalysisText(text);

  for (const [countryKey, aliases] of Object.entries(countryAliasMap)) {
    if (aliases.some((alias) => containsNormalizedAlias(normalizedText, alias))) {
      return countryLabelMap[countryKey] ?? countryKey;
    }
  }

  return undefined;
}

export function matchesCountrySelection(country: string | undefined, text: string, inferredCountry?: string) {
  const aliases = getCountryAliases(country);

  if (aliases.length === 0) {
    return true;
  }

  const normalizedInferredCountry = normalizeCountryKey(inferredCountry);

  if (normalizedInferredCountry === "remote global") {
    return true;
  }

  if (normalizedInferredCountry && aliases.includes(normalizedInferredCountry)) {
    return true;
  }

  const normalizedText = normalizeAnalysisText(text);
  if (countryAliasMap["remote global"].some((alias) => containsNormalizedAlias(normalizedText, alias))) {
    return true;
  }

  return aliases.some((alias) => containsNormalizedAlias(normalizedText, alias));
}

export function getCountryPriority(country: string | undefined, location: string, remoteType?: string, inferredCountry?: string) {
  if (!country) {
    return 0;
  }

  const normalizedInferredCountry = normalizeCountryKey(inferredCountry);

  if (normalizedInferredCountry === "remote global") {
    return 1;
  }

  const normalizedText = normalizeAnalysisText(`${location} ${remoteType ?? ""}`);
  if (countryAliasMap["remote global"].some((alias) => containsNormalizedAlias(normalizedText, alias))) {
    return 1;
  }

  return matchesCountrySelection(country, `${location} ${remoteType ?? ""}`, inferredCountry) ? 2 : 0;
}
