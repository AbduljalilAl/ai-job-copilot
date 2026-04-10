import "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";
import { normalizeAnalysisText } from "../src/lib/textNormalization.js";

const DEFAULT_CITIES_URL = "https://raw.githubusercontent.com/river-jade/cities15000/master/cities15000.txt";
const DEFAULT_COUNTRY_INFO_URL = "https://download.geonames.org/export/dump/countryInfo.txt";
const SOURCE_DATASET = "GeoNames cities15000";
const BATCH_SIZE = 1000;

interface GeoLocationSeedRow {
  geonameId?: number;
  cityName: string;
  asciiName?: string;
  normalizedCityName: string;
  countryCode: string;
  countryName: string;
  normalizedCountryName: string;
  admin1Code?: string;
  normalizedAdmin1Code?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  timezone?: string;
  sourceDataset: string;
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFloatValue(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchText(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download dataset from ${url} (${response.status}).`);
  }

  return response.text();
}

function buildLocationKey(row: GeoLocationSeedRow) {
  return [
    row.normalizedCityName,
    row.countryCode,
    row.normalizedAdmin1Code ?? ""
  ].join("|");
}

function pickBetterRow(current: GeoLocationSeedRow | undefined, candidate: GeoLocationSeedRow) {
  if (!current) {
    return candidate;
  }

  const currentPopulation = current.population ?? -1;
  const candidatePopulation = candidate.population ?? -1;

  if (candidatePopulation !== currentPopulation) {
    return candidatePopulation > currentPopulation ? candidate : current;
  }

  const currentAsciiLength = current.asciiName?.length ?? 0;
  const candidateAsciiLength = candidate.asciiName?.length ?? 0;

  if (candidateAsciiLength !== currentAsciiLength) {
    return candidateAsciiLength > currentAsciiLength ? candidate : current;
  }

  const currentCityLength = current.cityName.length;
  const candidateCityLength = candidate.cityName.length;

  return candidateCityLength >= currentCityLength ? candidate : current;
}

async function main() {
  const citiesUrl = process.env.GEOLOCATION_CITIES_DATA_URL || DEFAULT_CITIES_URL;
  const countryInfoUrl = process.env.GEOLOCATION_COUNTRY_INFO_URL || DEFAULT_COUNTRY_INFO_URL;

  console.info("Downloading GeoLocation datasets", {
    citiesUrl,
    countryInfoUrl
  });

  const [citiesText, countryInfoText] = await Promise.all([
    fetchText(citiesUrl),
    fetchText(countryInfoUrl)
  ]);

  const countryNameByCode = new Map<string, string>();

  for (const line of countryInfoText.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const columns = trimmed.split("\t");
    const countryCode = columns[0]?.trim();
    const countryName = columns[4]?.trim();

    if (countryCode && countryName) {
      countryNameByCode.set(countryCode, countryName);
    }
  }

  const parsedRows = citiesText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
    .filter((columns) => columns.length >= 18)
    .map((columns) => {
      const geonameId = parseInteger(columns[0] ?? "");
      const cityName = normalizeOptional(columns[1] ?? "");
      const asciiName = normalizeOptional(columns[2] ?? "");
      const latitude = parseFloatValue(columns[4] ?? "");
      const longitude = parseFloatValue(columns[5] ?? "");
      const featureClass = normalizeOptional(columns[6] ?? "");
      const countryCode = normalizeOptional(columns[8] ?? "");
      const admin1Code = normalizeOptional(columns[10] ?? "");
      const population = parseInteger(columns[14] ?? "");
      const timezone = normalizeOptional(columns[17] ?? "");
      const countryName = countryCode ? countryNameByCode.get(countryCode) : undefined;

      if (!cityName || !countryCode || !countryName || featureClass !== "P") {
        return undefined;
      }

      const normalizedCityName = normalizeAnalysisText(asciiName || cityName);

      return {
        geonameId,
        cityName,
        asciiName,
        normalizedCityName,
        countryCode,
        countryName,
        normalizedCountryName: normalizeAnalysisText(countryName),
        admin1Code,
        normalizedAdmin1Code: admin1Code ? normalizeAnalysisText(admin1Code) : undefined,
        latitude,
        longitude,
        population,
        timezone,
        sourceDataset: SOURCE_DATASET
      };
    })
    .filter((row): row is GeoLocationSeedRow => Boolean(row));

  const dedupedRows = new Map<string, GeoLocationSeedRow>();

  for (const row of parsedRows) {
    const key = buildLocationKey(row);
    dedupedRows.set(key, pickBetterRow(dedupedRows.get(key), row));
  }

  const rows = Array.from(dedupedRows.values());

  console.info(`Parsed ${parsedRows.length} geolocation rows and kept ${rows.length} unique rows. Replacing existing GeoLocation data.`);

  await prisma.geoLocation.deleteMany({});

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);

    await prisma.geoLocation.createMany({
      data: batch
    });
  }

  console.info(`Seeded ${rows.length} GeoLocation rows successfully.`);
}

main()
  .catch((error) => {
    console.error("GeoLocation seed failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
