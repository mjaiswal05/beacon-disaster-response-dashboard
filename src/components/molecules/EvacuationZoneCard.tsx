import { CheckCircle2, Loader, Play, Shield, XCircle } from "lucide-react";
import type { EvacuationStatus } from "../../types/core.types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const STATUS_STYLES: Record<EvacuationStatus, { bg: string; text: string; label: string }> = {
  planned: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Planned" },
  active: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Active" },
  completed: { bg: "bg-green-500/10", text: "text-green-400", label: "Completed" },
  cancelled: { bg: "bg-gray-500/10", text: "text-gray-400", label: "Cancelled" },
};

const ADVISORY_LABELS: Record<string, { text: string; style: string }> = {
  evacuate: { text: "Evacuate", style: "bg-red-500/10 text-red-400" },
  shelter_in_place: { text: "Shelter in Place", style: "bg-indigo-500/10 text-indigo-400" },
  all_clear: { text: "All Clear", style: "bg-green-500/10 text-green-400" },
};

interface EvacuationZoneCardProps {
  id: string;
  zoneName: string;
  status: EvacuationStatus;
  advisoryType?: string;
  shelterName?: string;
  notificationSent?: boolean;
  isUpdating: boolean;
  onActivate: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export function EvacuationZoneCard({
  id,
  zoneName,
  status,
  advisoryType,
  shelterName,
  notificationSent,
  isUpdating,
  onActivate,
  onComplete,
  onCancel,
  onViewDetails,
}: EvacuationZoneCardProps) {
  const style = STATUS_STYLES[status];
  const advisory = advisoryType ? ADVISORY_LABELS[advisoryType] : null;

  return (
    <Card className="bg-gray-900 border-gray-800 p-3">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 bg-blue-500/10 rounded-md flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-blue-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="text-white font-medium truncate text-sm font-mono">{zoneName}</h4>
            <span className={`px-1.5 py-0.5 text-[11px] rounded-full font-medium flex-shrink-0 ${style.bg} ${style.text}`}>
              {style.label}
            </span>
          </div>

          <div className="space-y-0.5 text-xs text-gray-400">
            {advisory && (
              <span className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${advisory.style}`}>
                {advisory.text}
              </span>
            )}
            {shelterName && (
              <p className="truncate">→ {shelterName}</p>
            )}
            {notificationSent && (
              <p className="text-green-400">Advisory sent</p>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <Button
              onClick={() => onViewDetails(id)}
              variant="outline"
              className="h-6.5 px-2.5 text-xs border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Details
            </Button>
            {status === "planned" && (
              <Button
                onClick={() => onActivate(id)}
                disabled={isUpdating}
                className="h-6.5 px-2.5 text-xs bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
              >
                {isUpdating
                  ? <Loader className="w-3 h-3 animate-spin mr-1" aria-hidden="true" />
                  : <Play className="w-3 h-3 mr-1" aria-hidden="true" />}
                Activate
              </Button>
            )}
            {status === "active" && (
              <>
                <Button
                  onClick={() => onComplete(id)}
                  disabled={isUpdating}
                  className="h-6.5 px-2.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {isUpdating
                    ? <Loader className="w-3 h-3 animate-spin mr-1" aria-hidden="true" />
                    : <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />}
                  Complete
                </Button>
                <Button
                  onClick={() => onCancel(id)}
                  disabled={isUpdating}
                  variant="outline"
                  className="h-6.5 px-2.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
