import { FileText, Link, MapPin, Phone } from "lucide-react";
import type { ResourceItem, TransportMode } from "../../types/core.types";
import { formatTimeAgo } from "../../utils/date.utils";
import { cn } from "../ui/utils";

interface AdvisoryHistoryCardProps {
  advisoryType: string | undefined;
  advisoryTitle: string | undefined;
  advisoryBody: string | undefined;
  zoneName: string;
  shelterName?: string | null;
  shelterAddress?: string | null;
  transportMode?: TransportMode | null;
  resources?: ResourceItem[];
  sentAt: string;
}

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  evacuate: { label: "EVACUATE", className: "bg-red-500/20 text-red-400 border border-red-500/30" },
  shelter_in_place: { label: "SHELTER IN PLACE", className: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" },
  all_clear: { label: "ALL CLEAR", className: "bg-green-500/20 text-green-400 border border-green-500/30" },
};

const FALLBACK_BADGE = { label: "ADVISORY", className: "bg-gray-700 text-gray-400 border border-gray-600" };

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car: "Car / Taxi",
  pedestrian: "On Foot",
  public_transport: "Public Transport",
};

const RESOURCE_ICONS: Record<ResourceItem["type"], React.ReactNode> = {
  phone: <Phone className="w-3 h-3" aria-hidden="true" />,
  link: <Link className="w-3 h-3" aria-hidden="true" />,
  document: <FileText className="w-3 h-3" aria-hidden="true" />,
  checklist: <span className="text-[10px] font-bold leading-none">✓</span>,
};

export function AdvisoryHistoryCard({
  advisoryType,
  advisoryTitle,
  advisoryBody,
  zoneName,
  shelterName,
  shelterAddress,
  transportMode,
  resources = [],
  sentAt,
}: AdvisoryHistoryCardProps) {
  const badge = (advisoryType && TYPE_BADGE[advisoryType]) ?? FALLBACK_BADGE;

  const checklistItems = resources.filter((r) => r.type === "checklist");
  const contactItems = resources.filter((r) => r.type === "phone");
  const linkItems = resources.filter((r) => r.type === "link" || r.type === "document");

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className={cn("self-start px-2 py-0.5 text-xs font-semibold rounded", badge.className)}>
          {badge.label}
        </span>
        <span className="text-gray-500 text-xs shrink-0">Sent {formatTimeAgo(sentAt)}</span>
      </div>

      {/* Title */}
      {advisoryTitle && (
        <p className="text-white text-sm font-semibold leading-tight">{advisoryTitle}</p>
      )}

      {/* Body — full text, no truncation */}
      {advisoryBody && (
        <p className="text-gray-400 text-xs leading-relaxed">{advisoryBody}</p>
      )}

      {/* Shelter + transport */}
      {(shelterName || transportMode) && (
        <div className="grid grid-cols-1 gap-1.5">
          {shelterName && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 mt-0.5 text-gray-500 shrink-0" aria-hidden="true" />
              <span>
                <span className="text-gray-300">{shelterName}</span>
                {shelterAddress && <span className="text-gray-500"> · {shelterAddress}</span>}
              </span>
            </div>
          )}
          {transportMode && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-gray-500">Travel:</span>
              <span className="text-gray-300">{TRANSPORT_LABELS[transportMode]}</span>
            </div>
          )}
        </div>
      )}

      {/* Zone */}
      <div className="flex items-center gap-1 border-t border-gray-800 pt-2">
        <MapPin className="w-3 h-3 text-gray-500 shrink-0" aria-hidden="true" />
        <span className="text-gray-400 text-xs truncate">Zone: {zoneName}</span>
      </div>

      {/* Resources — collapsible */}
      {resources.length > 0 && (
        <details className="-mt-1">
          <summary className="text-xs text-gray-500 cursor-pointer select-none hover:text-gray-400 transition-colors">
            {resources.length} resource{resources.length !== 1 ? "s" : ""} attached
          </summary>
          <div className="mt-2 space-y-3">
            {checklistItems.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Safety Steps</p>
                <ul className="space-y-1">
                  {checklistItems.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-400">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {contactItems.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Emergency Contacts</p>
                <ul className="space-y-1">
                  {contactItems.map((r, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Phone className="w-3 h-3 text-blue-400 shrink-0" aria-hidden="true" />
                      {r.label}{r.value ? `: ${r.value}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {linkItems.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Links</p>
                <ul className="space-y-1">
                  {linkItems.map((r, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                      {RESOURCE_ICONS[r.type]}
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                          {r.label}
                        </a>
                      ) : (
                        <span>{r.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
