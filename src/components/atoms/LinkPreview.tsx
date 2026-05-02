import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    return null;
  } catch {
    return null;
  }
}

function parseUrl(url: string): { hostname: string; pathname: string } {
  try {
    const u = new URL(url);
    return {
      hostname: u.hostname.replace(/^www\./, ""),
      pathname: u.pathname === "/" ? "" : u.pathname,
    };
  } catch {
    return { hostname: url, pathname: "" };
  }
}

interface LinkPreviewProps {
  url: string;
  /** Compact mode — used inside the post feed card (smaller height). */
  compact?: boolean;
}

export function LinkPreview({ url, compact = false }: LinkPreviewProps) {
  const [ytImgError, setYtImgError] = useState(false);
  const ytId = extractYouTubeId(url);
  const { hostname, pathname } = parseUrl(url);

  if (ytId && !ytImgError) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`block mt-2 rounded-xl overflow-hidden relative group ${compact ? "max-h-36" : "max-h-52"}`}
        aria-label="Watch on YouTube"
      >
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt="YouTube thumbnail"
          className="w-full object-cover"
          style={{ maxHeight: compact ? 144 : 208 }}
          onError={() => setYtImgError(true)}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110"
            style={{ background: "#FF0000" }}
          >
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" strokeWidth={0} />
          </div>
        </div>
        {/* Footer bar */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
        >
          <p className="text-[11px] text-white/60 font-medium">YouTube</p>
        </div>
      </a>
    );
  }

  // Generic link card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 mt-2 px-3 py-2.5 rounded-xl hover:opacity-80 transition-opacity"
      style={{ background: "#141414", border: "1px solid #1C1C1C" }}
      aria-label={`Open ${hostname}`}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
        alt=""
        aria-hidden="true"
        className="w-5 h-5 rounded shrink-0"
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-blue-400 font-medium truncate">{hostname}</p>
        {pathname && (
          <p className="text-[11px] text-gray-500 truncate">{pathname}</p>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-gray-500 shrink-0" strokeWidth={1.5} />
    </a>
  );
}
