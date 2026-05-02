import { formatTimeAgo } from "../../utils/date.utils";

interface TimeAgoProps {
  timestamp: string;
  className?: string;
}

export function TimeAgo({ timestamp, className }: TimeAgoProps) {
  return (
    <time className={className} dateTime={timestamp} title={timestamp}>
      {formatTimeAgo(timestamp)}
    </time>
  );
}
