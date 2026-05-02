import { Search } from "lucide-react";
import { Input } from "../ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  "aria-label": ariaLabel = "Search",
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-9 bg-secondary border-border text-foreground"
      />
    </div>
  );
}
