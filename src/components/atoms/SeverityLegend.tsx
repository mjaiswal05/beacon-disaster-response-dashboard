import {
  getSeverityBadgeStyle,
  getSeverityLabel,
} from "../../utils/incident.utils";

const SEVERITIES = ["P0", "P1", "P2", "P3"] as const;

export function SeverityLegend() {
  return (
    <div className="flex items-center gap-3 text-xs">
      {SEVERITIES.map((s) => {
        const style = getSeverityBadgeStyle(s);
        return (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${style.bg}`}
              aria-hidden="true"
            />
            <span className="text-gray-400">{getSeverityLabel(s)}</span>
          </span>
        );
      })}
    </div>
  );
}
