export interface GreenhouseBoardRegistryEntry {
  token: string;
  companyName: string;
}

// Curated public Greenhouse boards used for automated discovery.
// Extra company boards can still be appended through GREENHOUSE_BOARD_TOKENS.
export const greenhouseBoardRegistry: GreenhouseBoardRegistryEntry[] = [
  { token: "airbnb", companyName: "Airbnb" },
  { token: "datadog", companyName: "Datadog" },
  { token: "manifoldbio", companyName: "Manifold Bio" },
  { token: "openai", companyName: "OpenAI" },
  { token: "pendo", companyName: "Pendo" },
  { token: "semgrep", companyName: "Semgrep" },
  { token: "stripe", companyName: "Stripe" }
];
