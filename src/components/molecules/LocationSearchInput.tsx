import { useState } from "react";
import { MapPin, Loader } from "lucide-react";
import { Input } from "../ui/input";
import {
  useLocationSearch,
  type LocationSuggestion,
} from "../../hooks/useLocationSearch";

interface LocationSearchInputProps {
  onSelect: (suggestion: LocationSuggestion) => void;
  placeholder?: string;
}

export function LocationSearchInput({
  onSelect,
  placeholder = "Search location...",
}: LocationSearchInputProps) {
  const [query, setQuery] = useState("");
  const { suggestions, isSearching, showSuggestions, hideSuggestions } =
    useLocationSearch(query);

  const handleSelect = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.display_name);
    hideSuggestions();
    onSelect(suggestion);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search location"
          className="pl-9 pr-9 bg-secondary border-border text-foreground"
        />
        {isSearching && (
          <Loader
            className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
            aria-hidden="true"
          />
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-secondary border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-gray-700 hover:text-foreground transition-colors"
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
