import { prisma } from "../lib/prisma.js";
import { normalizeLocationLookupKey } from "../lib/jobDiscoveryUtils.js";

type MappingSource = "deterministic" | "openai";

interface LocationCountryMappingInput {
  location: string;
  country: string;
  source: MappingSource;
}

export class LocationCountryMappingService {
  async findCountries(locations: string[]) {
    const normalizedEntries = locations
      .map((location) => ({
        location: location.trim(),
        normalizedLocation: normalizeLocationLookupKey(location)
      }))
      .filter((entry): entry is { location: string; normalizedLocation: string } => Boolean(entry.location && entry.normalizedLocation));

    if (normalizedEntries.length === 0) {
      return {};
    }

    const records = await prisma.locationCountryMapping.findMany({
      where: {
        normalizedLocation: {
          in: Array.from(new Set(normalizedEntries.map((entry) => entry.normalizedLocation)))
        }
      }
    });

    const countryByNormalizedLocation = new Map(
      records.map((record) => [record.normalizedLocation, record.country])
    );

    return normalizedEntries.reduce<Record<string, string>>((accumulator, entry) => {
      const country = countryByNormalizedLocation.get(entry.normalizedLocation);

      if (country) {
        accumulator[entry.location] = country;
      }

      return accumulator;
    }, {});
  }

  async saveMappings(mappings: LocationCountryMappingInput[]) {
    const normalizedMappings = Array.from(
      new Map(
        mappings
          .map((mapping) => ({
            ...mapping,
            location: mapping.location.trim(),
            country: mapping.country.trim(),
            normalizedLocation: normalizeLocationLookupKey(mapping.location)
          }))
          .filter((mapping): mapping is LocationCountryMappingInput & { normalizedLocation: string } =>
            Boolean(mapping.location && mapping.country && mapping.normalizedLocation)
          )
          .map((mapping) => [mapping.normalizedLocation, mapping])
      ).values()
    );

    if (normalizedMappings.length === 0) {
      return;
    }

    await Promise.all(
      normalizedMappings.map((mapping) =>
        prisma.locationCountryMapping.upsert({
          where: {
            normalizedLocation: mapping.normalizedLocation
          },
          create: {
            normalizedLocation: mapping.normalizedLocation,
            originalLocation: mapping.location,
            country: mapping.country,
            source: mapping.source
          },
          update: {
            originalLocation: mapping.location,
            country: mapping.country,
            source: mapping.source
          }
        })
      )
    );
  }
}
