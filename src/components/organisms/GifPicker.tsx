import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Tenor API (free, no user account required) ──────────────────────────────
// Using the Tenor v2 API with the public demo key.
const TENOR_KEY    = "AIzaSyAyimkuYQYF_FXVALexPzkcsvZiClL7blQ";
const TENOR_LIMIT  = 20;

interface TenorGif {
  id: string;
  title: string;
  url: string;        // page url, unused
  mediaFormats: {
    gif?: { url: string; dims: [number, number] };
    tinygif?: { url: string; dims: [number, number] };
    nanogif?: { url: string; dims: [number, number] };
  };
}

async function tenorSearch(query: string): Promise<TenorGif[]> {
  const endpoint = query.trim()
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${TENOR_LIMIT}&media_filter=tinygif,gif`
    : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=${TENOR_LIMIT}&media_filter=tinygif,gif`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Tenor API error");
  const data = await res.json();
  return (data.results ?? []) as TenorGif[];
}

// ── Serialisation ─────────────────────────────────────────────────────────────
export const GIF_PREFIX = "[GIF]";

export interface GifAttachment {
  url: string;
  width: number;
  height: number;
  title: string;
}

export function encodeGif(gif: GifAttachment): string {
  return `${GIF_PREFIX}${JSON.stringify(gif)}`;
}

export function decodeGif(content: string): GifAttachment | null {
  if (!content.startsWith(GIF_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(GIF_PREFIX.length)) as GifAttachment;
  } catch {
    return null;
  }
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = "#0A0A0A";
const CARD   = "#141414";
const BORDER = "#1C1C1C";
const MUT    = "#8A8F98";
const DIM    = "#4a4a52";

// ── Component ─────────────────────────────────────────────────────────────────

interface GifPickerProps {
  onSelect: (gif: GifAttachment) => void;
  onClose: () => void;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery]           = useState("");
  const [gifs, setGifs]             = useState<TenorGif[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const searchTimeoutRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await tenorSearch(q);
      setGifs(results);
    } catch {
      setError("Could not load GIFs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trending on mount.
  useEffect(() => {
    load("");
    inputRef.current?.focus();
  }, [load]);

  // Debounce search.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => load(query), 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, load]);

  const handleSelect = (gif: TenorGif) => {
    const fmt = gif.mediaFormats.tinygif ?? gif.mediaFormats.gif;
    if (!fmt) return;
    onSelect({
      url: fmt.url,
      width: fmt.dims[0],
      height: fmt.dims[1],
      title: gif.title || "GIF",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 460, damping: 38 }}
      className="absolute bottom-full mb-2 right-0 rounded-[16px] overflow-hidden flex flex-col"
      style={{
        width: 320,
        height: 380,
        background: BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        zIndex: 60,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div
          className="flex items-center gap-2 flex-1 px-2.5 h-8 rounded-[8px]"
          style={{ background: CARD, border: `1px solid ${BORDER}` }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: MUT }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            className="flex-1 bg-transparent text-white placeholder-[#4a4a52] focus:outline-none"
            style={{ fontSize: "12px" }}
            aria-label="Search GIFs"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X className="w-3 h-3" style={{ color: MUT }} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#1C1C1C] transition-colors shrink-0"
          aria-label="Close GIF picker"
        >
          <X className="w-3.5 h-3.5" style={{ color: MUT }} />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-5 h-5 animate-spin" style={{ color: MUT }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p style={{ fontSize: "12px", color: "#FF453A" }}>{error}</p>
            <button
              onClick={() => load(query)}
              className="px-3 py-1.5 rounded-[8px] text-white"
              style={{ background: "#1C1C1C", fontSize: "12px" }}
            >
              Retry
            </button>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ fontSize: "12px", color: DIM }}>No GIFs found</p>
          </div>
        ) : (
          <div className="columns-2 gap-1.5 space-y-1.5">
            {gifs.map((gif) => {
              const fmt = gif.mediaFormats.tinygif ?? gif.mediaFormats.gif;
              if (!fmt) return null;
              return (
                <button
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="block w-full rounded-[8px] overflow-hidden transition-opacity hover:opacity-80 active:opacity-60 break-inside-avoid"
                  style={{ background: CARD }}
                  aria-label={gif.title || "GIF"}
                >
                  <img
                    src={fmt.url}
                    alt={gif.title}
                    className="w-full block"
                    loading="lazy"
                    style={{ aspectRatio: `${fmt.dims[0]} / ${fmt.dims[1]}` }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Powered by Tenor */}
      <div
        className="px-3 py-1.5 shrink-0 flex items-center justify-center"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <span style={{ fontSize: "10px", color: DIM }}>Powered by Tenor</span>
      </div>
    </motion.div>
  );
}
