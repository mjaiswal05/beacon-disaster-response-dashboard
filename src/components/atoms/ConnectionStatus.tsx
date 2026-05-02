import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  hasChannel: boolean;
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  hasChannel,
}: ConnectionStatusProps) {
  if (!hasChannel) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 rounded-lg">
        <span className="text-gray-400 text-sm">No channel selected</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg">
        <div
          className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
          aria-hidden="true"
        />
        <span className="text-yellow-400 text-sm">Connecting...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg">
        <Wifi className="w-4 h-4 text-green-400" aria-hidden="true" />
        <span className="text-green-400 text-sm">Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg">
      <WifiOff className="w-4 h-4 text-red-500" aria-hidden="true" />
      <span className="text-red-500 text-sm">Disconnected</span>
    </div>
  );
}
