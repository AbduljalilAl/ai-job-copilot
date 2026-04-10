import { prisma } from "../lib/prisma.js";
import { inferCountryFromText, inferWorkModeFromText, normalizeCountryKey, normalizeLocationLookupKey } from "../lib/jobDiscoveryUtils.js";
import { uniqueSorted } from "../lib/textNormalization.js";

interface GeoLocationCandidate {
  countryName: string;
  normalizedCityName: string;
}

function buildCandidatePhrases(location: string) {
  const rawSegments = location
    .split(/[,/()|-]+/)
    .map((segment) => normalizeLocationLookupKey(segment))
    .filter((segment): segment is string => Boolean(segment));
  const phrases = new Set<string>();

  for (const segment of rawSegments) {
    phrases.add(segment);

    const words = segment.split(" ").filter(Boolean);
    const maxPhraseLength = Math.min(3, words.length);

    for (let size = 1; size <= maxPhraseLength; size += 1) {
      for (let start = 0; start <= words.length - size; start += 1) {
        phrases.add(words.slice(start, start + size).join(" "));
      }
    }
  }

  return Array.from(phrases);
}

export class GeoLocationService {
  private readonly resolutionCache = new Map<string, string | null>();

  async resolveCountriesForLocations(locations: string[], preferredCountry?: string) {
    const uniqueLocations = uniqueSorted(
      locations.map((location) => location.trim()).filter((location) => location.length > 0)
    );
    const results: Record<string, string> = {};
    const candidatePhraseByLocation = new Map<string, string[]>();
    const unresolvedLocations: string[] = [];
    const normalizedPreferredCountry = normalizeCountryKey(preferredCountry);

    for (const location of uniqueLocations) {
      const cachedCountry = this.resolutionCache.get(location);

      if (cachedCountry !== undefined) {
        if (cachedCountry) {
          results[location] = cachedCountry;
        }
        continue;
      }

      const explicitCountry = inferCountryFromText(location);
      if (explicitCountry) {
        results[location] = explicitCountry;
        this.resolutionCache.set(location, explicitCountry);
        continue;
      }

      const inferredWorkMode = inferWorkModeFromText(location);
      if (inferredWorkMode === "remote") {
        results[location] = "Remote / Global";
        this.resolutionCache.set(location, "Remote / Global");
        continue;
      }

      const phrases = buildCandidatePhrases(location);
      if (phrases.length === 0) {
        continue;
      }

      candidatePhraseByLocation.set(location, phrases);
      unresolvedLocations.push(location);
    }

    if (unresolvedLocations.length === 0) {
      return results;
    }

    const allPhrases = Array.from(
      new Set(unresolvedLocations.flatMap((location) => candidatePhraseByLocation.get(location) ?? []))
    );

    if (allPhrases.length === 0) {
      return results;
    }

    const records = await prisma.geoLocation.findMany({
      where: {
        normalizedCityName: { in: allPhrases }
      },
      select: {
        countryName: true,
        normalizedCityName: true
      }
    });

    const candidates = records as GeoLocationCandidate[];

    for (const location of unresolvedLocations) {
      const phrases = new Set(candidatePhraseByLocation.get(location) ?? []);
      const scoredCountries = new Map<string, { score: number }>();

      for (const candidate of candidates) {
        let score = 0;

        if (phrases.has(candidate.normalizedCityName)) {
          score += 6;
        }

        if (normalizedPreferredCountry && normalizeCountryKey(candidate.countryName) === normalizedPreferredCountry) {
          score += 2;
        }

        if (score === 0) {
          continue;
        }

        const existing = scoredCountries.get(candidate.countryName);
        if (!existing || score > existing.score) {
          scoredCountries.set(candidate.countryName, {
            score
          });
        }
      }

      const rankedCountries = Array.from(scoredCountries.entries())
        .sort((left, right) => right[1].score - left[1].score);

      if (rankedCountries.length === 0) {
        continue;
      }

      if (normalizedPreferredCountry) {
        const preferredMatch = rankedCountries.find((entry) => normalizeCountryKey(entry[0]) === normalizedPreferredCountry);
        const topScore = rankedCountries[0]?.[1].score ?? 0;

        if (preferredMatch && preferredMatch[1].score >= topScore - 1) {
          results[location] = preferredMatch[0];
          this.resolutionCache.set(location, preferredMatch[0]);
          continue;
        }
      }

      const [topCountry, topMeta] = rankedCountries[0];
      const secondScore = rankedCountries[1]?.[1].score ?? -1;

      if (topMeta.score >= secondScore + 2) {
        results[location] = topCountry;
        this.resolutionCache.set(location, topCountry);
      } else {
        this.resolutionCache.set(location, null);
      }
    }

    return results;
  }
}
