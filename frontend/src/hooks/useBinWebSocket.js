import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
const WS_URL = `${API_BASE.replace(/^http/, "ws")}/ws/bins`;

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
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }

    console.log("[WebSocket] Connecting to", WS_URL);
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket] Connection established!");
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
        console.log("[WebSocket] Message received:", payload);

        const eventType = (payload.event || payload.type || "").toUpperCase();
        const data = payload.data || payload;

        if (eventType === "INIT_SNAPSHOT" || eventType === "INITSNAPSHOT") {
          onInitRef.current?.(data);
        } else if (
          eventType === "BIN_UPDATED" ||
          eventType === "BIN_UPDATE" ||
          eventType === "BINUPDATES"
        ) {
          onBinRef.current?.(data);
        } else if (
          eventType === "SENSOR_UPDATE" ||
          eventType === "SENSORREADING"
        ) {
          onSensorRef.current?.(data);
        }
      } catch (err) {
        console.error("[WebSocket] Error parsing message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
    };

    ws.onclose = (event) => {
      console.log("[WebSocket] Connection closed:", event.code, "Reason:", event.reason);
      setIsConnected(false);
      socketRef.current = null;

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
        socketRef.current.close(1000, "Client disconnected");
        socketRef.current = null;
      }
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    connect();
  }, [connect]);

  return { isConnected, isReconnecting, reconnect };
}