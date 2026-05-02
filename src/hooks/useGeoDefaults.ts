// Resolves Ireland country ID and Dublin city ID from the observability API.
// Falls back to stable hardcoded defaults if the API is unavailable.
import { useQuery } from "@tanstack/react-query";
import { listCities, listCountries } from "../services/observability.api";
import type { City, Country } from "../types/observability.types";

/** Stable defaults - Ireland country id = 105, Dublin city id = 57223 */
export const DEFAULT_COUNTRY_ID = 105;
export const DEFAULT_CITY_ID = 57223;

export function useGeoDefaults() {
  const countriesQuery = useQuery<Country[]>({
    queryKey: ["geo", "countries"],
    queryFn: listCountries,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
  });

  // Resolve Ireland from the list; fall back to default immediately
  const countryId =
    countriesQuery.data?.find((c) =>
      c.name?.toLowerCase().includes("ireland"),
    )?.id ?? DEFAULT_COUNTRY_ID;

  const citiesQuery = useQuery<City[]>({
    queryKey: ["geo", "cities", countryId],
    queryFn: () => listCities(countryId),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    // Don't wait for countries fetch - use default country ID immediately
    enabled: true,
  });

  // Resolve Dublin from the list; fall back to default immediately
  const matchedCity = citiesQuery.data?.find((c) =>
    c.name?.toLowerCase().includes("dublin"),
  );
  const cityId = matchedCity?.id ?? DEFAULT_CITY_ID;
  const cityName = matchedCity?.name ?? "Dublin";

  const matchedCountry = countriesQuery.data?.find((c) =>
    c.name?.toLowerCase().includes("ireland"),
  );
  const countryName = matchedCountry?.name ?? "Ireland";

  return {
    /** Ireland country ID (numeric) - used for country-scoped endpoints */
    countryId,
    /** Dublin city ID (numeric) */
    cityId,
    /** Dublin city ID as string - used for city-scoped endpoints (vehicles, traffic) */
    cityIdStr: String(cityId),
    /** Resolved city name - e.g. "Dublin" */
    cityName,
    /** Resolved country name - e.g. "Ireland" */
    countryName,
    isLoading: countriesQuery.isLoading || citiesQuery.isLoading,
  };
}
