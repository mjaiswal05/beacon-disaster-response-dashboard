import { useQuery } from "@tanstack/react-query";
import { listStates } from "../services/observability.api";

export interface County {
  name: string;
  value: string;
  lat: number;
  lng: number;
  zoom: number;
}

const COUNTRY_ID = 105; // Ireland
const DEFAULT_CENTER = { lat: 53.3498, lng: -6.2603 };

const ALL_COUNTIES_ENTRY: County = {
  name: "All Counties",
  value: "all",
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
  zoom: 7,
};

/**
 * Fetches Irish states (counties) from the observability API and maps them
 * to the `County` shape used by map components.
 * Returns "All Counties" as the first entry, followed by alphabetically sorted counties.
 */
export function useCounties() {
  const { data: counties = [ALL_COUNTIES_ENTRY], isLoading } = useQuery({
    queryKey: ["states", COUNTRY_ID],
    queryFn: async () => {
      const states = await listStates(COUNTRY_ID, { page_size: 100 });
      const mapped: County[] = states
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          name: s.name,
          value: s.name.toLowerCase().replace(/\s+/g, "-"),
          lat: s.latitude!,
          lng: s.longitude!,
          zoom: 10,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return [ALL_COUNTIES_ENTRY, ...mapped];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return { counties, isLoading };
}
