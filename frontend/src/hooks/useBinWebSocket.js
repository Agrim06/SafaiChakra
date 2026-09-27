import { useEffect, useRef, useState, useCallback } from "react";

const rawApiBase = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const normalizedBase = rawApiBase.replace("localhost", "127.0.0.1");
const WS_URL = `${normalizedBase.replace(/^http/, "ws")}/ws/bins`;

export function useBinWebSocket({
  onInitSnapshot,
  onBinUpdate,
  onSensorUpdate,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const onInitRef = useRef(onInitSnapshot);
  const onBinRef = useRef(onBinUpdate);
  const onSensorRef = useRef(onSensorUpdate);

  useEffect(() => {
    onInitRef.current = onInitSnapshot;
    onBinRef.current = onBinUpdate;
    onSensorRef.current = onSensorUpdate;
  }, [onInitSnapshot, onBinUpdate, onSensorUpdate]);

  const connect = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.CONNECTING ||
        socketRef.current.readyState === WebSocket.OPEN)
    ) {
      return;
    }


    console.log("[WebSocket] Connecting to", WS_URL);
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket] Connection established to", WS_URL);
      setIsConnected(true);
      setIsReconnecting(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("[WebSocket] Message received:", payload.event || payload.type);

        const rawEvent = payload.event || payload.type || "";
        const normalized = rawEvent.toUpperCase().replace(/[\s_-]/g, "");
        const data = payload.data || payload;

        if (normalized === "INITSNAPSHOT") {
          console.log("[WebSocket] Dispatching INIT_SNAPSHOT with bins:", data.all_bins?.length);
          onInitRef.current?.(data);
        } else if (normalized.startsWith("BINUPDATE")) {
          console.log("[WebSocket] Dispatching BIN_UPDATE for bin:", data.bin_id || data.id);
          onBinRef.current?.(data);
        } else if (normalized.startsWith("SENSOR")) {
          console.log("[WebSocket] Dispatching SENSOR_UPDATE:", data);
          onSensorRef.current?.(data);
        }
      } catch (err) {
        console.error("[WebSocket] Error parsing message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Error on socket:", err);
    };

    ws.onclose = (event) => {
      console.log("[WebSocket] Connection closed:", event.code, "Reason:", event.reason);
      setIsConnected(false);
      socketRef.current = null;

      // Do not trigger reconnect timer if explicitly closed by component unmount (code 1000)
      if (event.code === 1000) return;

      setIsReconnecting(true);
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[WebSocket] Attempting reconnect...");
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        const s = socketRef.current;
        socketRef.current = null;
        s.onopen = null;
        s.onmessage = null;
        s.onerror = null;
        s.onclose = null;
        s.close(1000, "Client disconnected");
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      const s = socketRef.current;
      socketRef.current = null;
      s.onopen = null;
      s.onmessage = null;
      s.onerror = null;
      s.onclose = null;
      s.close(1000, "Manual reconnect");
    }
    connect();
  }, [connect]);

  return { isConnected, isReconnecting, reconnect };
}