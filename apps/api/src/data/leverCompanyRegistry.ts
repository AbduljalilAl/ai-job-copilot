export interface LeverCompanyRegistryEntry {
  token: string;
  companyName: string;
}

// Curated public Lever companies used for automated discovery.
// Extra Lever companies can still be appended through LEVER_COMPANY_TOKENS.
export const leverCompanyRegistry: LeverCompanyRegistryEntry[] = [
  { token: "coursera", companyName: "Coursera" },
  { token: "figma", companyName: "Figma" },
  { token: "gusto", companyName: "Gusto" },
  { token: "mixpanel", companyName: "Mixpanel" },
  { token: "mural", companyName: "Mural" },
  { token: "palantir", companyName: "Palantir" },
  { token: "robinhood", companyName: "Robinhood" }
];
