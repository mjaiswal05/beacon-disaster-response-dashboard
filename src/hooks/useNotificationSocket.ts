import { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";
import { useNavigate } from "react-router-dom";

const WS_NOTIF_URL = "wss://beacon-tcd.tech/api/notification/ws";

export function useNotificationSocket(
  userId: string | undefined,
  activeChannelId?: string,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const reconnectDelayRef = useRef(1000);
  const intentionalCloseRef = useRef(false);
  // Keep latest values without triggering reconnects
  const activeChannelIdRef = useRef(activeChannelId);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    intentionalCloseRef.current = false;

    function connect() {
      if (intentionalCloseRef.current) return;

      const ws = new WebSocket(`${WS_NOTIF_URL}?user_id=${encodeURIComponent(userId!)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const notif = JSON.parse(event.data as string);
          const category = notif.category ?? notif.data?.category;
          const roomId = notif.data?.room_id ?? notif.variables?.room_id;
          const channelName =
            notif.data?.channel_name ??
            notif.variables?.channel_name ??
            "a channel";
          const body =
            notif.data?.body ?? notif.variables?.body ?? "";

          if (category === "message" && roomId && roomId !== activeChannelIdRef.current) {
            sonnerToast(`New message in ${channelName}: ${body}`, {
              duration: 5000,
              action: {
                label: "Open",
                onClick: () => navigateRef.current(`/communication?channel=${roomId}`),
              },
            });
          } else if (category === "incident") {
            sonnerToast.warning(`Incident alert: ${body}`, { duration: 8000 });
          }
        } catch {
          // Ignore unparseable messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!intentionalCloseRef.current) {
          const delay = reconnectDelayRef.current;
          reconnectDelayRef.current = Math.min(delay * 2, 30_000);
          setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror and handle reconnect
      };
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId]);
}
