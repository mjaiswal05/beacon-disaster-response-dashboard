import { Train as TrainIcon } from "lucide-react";
import type { Train } from "../../services/observability.api";
import { TransportStatusBadge } from "../atoms/TransportStatusBadge";

interface TrainCardProps {
  trainCode: string;
  trainStatus: string;
  direction: string | undefined;
  publicMessage: string | undefined;
  trainDate: string;
}

export function TrainCard({
  trainCode,
  trainStatus,
  direction,
  publicMessage,
}: TrainCardProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mt-0.5">
        <TrainIcon className="w-4 h-4 text-purple-400" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-white text-sm font-medium">{trainCode}</p>
          <TransportStatusBadge status={trainStatus} />
        </div>
        {direction && (
          <p className="text-gray-400 text-xs mt-0.5">{direction}</p>
        )}
        {publicMessage && (
          <p className="text-gray-500 text-xs mt-0.5 truncate">{publicMessage}</p>
        )}
      </div>
    </div>
  );
}

export function trainToCardProps(t: Train): TrainCardProps {
  return {
    trainCode: t.train_code,
    trainStatus: t.train_status,
    direction: t.direction,
    publicMessage: t.public_message,
    trainDate: t.train_date,
  };
}
