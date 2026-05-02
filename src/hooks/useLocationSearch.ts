import { useCallback, useEffect, useState } from "react";
import { searchLocations, type LocationSearchResult } from "../services/core.api";

export interface LocationSuggestion {
  display_name: string;
  lat: number;
  lng: number;
  address: Record<string, string>;
  place_id: string;
}

function mapResult(r: LocationSearchResult): LocationSuggestion {
  return {
    display_name: r.display_name,
    lat: r.lat,
    lng: r.lng,
    address: r.address as Record<string, string>,
    place_id: r.place_id,
  };
}

export function useLocationSearch(query: string, debounceMs = 500) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);

    try {
      const results = await searchLocations(q, 5);
      setSuggestions(results.map(mapResult));
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), debounceMs);
    return () => clearTimeout(timeout);
  }, [query, debounceMs, search]);

  const hideSuggestions = useCallback(() => setShowSuggestions(false), []);

  return { suggestions, isSearching, showSuggestions, hideSuggestions };
}
