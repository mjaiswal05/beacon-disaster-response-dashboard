import { ChannelItem } from "../molecules/ChannelItem";
import { LoadingSpinner } from "../atoms/LoadingSpinner";
import { Hash } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  unreadCount?: number;
}

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  isLoading: boolean;
  onSelectChannel: (id: string) => void;
}

export function ChannelSidebar({
  channels,
  activeChannelId,
  isLoading,
  onSelectChannel,
}: ChannelSidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Hash className="w-4 h-4" aria-hidden="true" />
          Channels
        </h2>
      </div>

      <nav
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
        aria-label="Chat channels"
      >
        {isLoading ? (
          <LoadingSpinner label="Loading channels…" />
        ) : channels.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3">
            No channels available
          </p>
        ) : (
          channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              id={channel.id}
              name={channel.name}
              unreadCount={channel.unreadCount}
              isActive={activeChannelId === channel.id}
              onClick={onSelectChannel}
            />
          ))
        )}
      </nav>
    </aside>
  );
}
