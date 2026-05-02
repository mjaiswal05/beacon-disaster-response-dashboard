import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL = "wss://beacon-tcd.tech/api/communication/ws";

interface UseWebSocketOptions {
  userId: string;
  roomId: string | null;
  onMessage: (roomId: string, event: MessageEvent) => void;
}

export function useWebSocket({
  userId,
  roomId,
  onMessage,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const send = useCallback((payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    // Tear down previous connection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
    setIsConnecting(false);

    if (!roomId) return;

    const currentRoomId = roomId;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      setIsConnecting(true);
      intentionalCloseRef.current = false;

      try {
        const wsUrl = `${WS_URL}?user_id=${encodeURIComponent(userId)}&room_id=${encodeURIComponent(currentRoomId)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setIsConnecting(false);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => onMessage(currentRoomId, event);

        ws.onclose = () => {
          setIsConnected(false);
          setIsConnecting(false);
          wsRef.current = null;

          if (
            !intentionalCloseRef.current &&
            reconnectAttemptsRef.current < 5
          ) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000,
            );
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(connect, delay);
          }
        };

        ws.onerror = () => {
          setIsConnecting(false);
        };
      } catch {
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, userId, onMessage]);

  return { isConnected, isConnecting, send };
}
