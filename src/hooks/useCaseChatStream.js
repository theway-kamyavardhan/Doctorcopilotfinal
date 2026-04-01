import { useEffect, useRef, useState } from "react";
import api, { getAuthToken } from "../services/api";

export default function useCaseChatStream(caseId, { enabled = true, onMessage } = {}) {
  const [connectionState, setConnectionState] = useState("idle");
  const reconnectTimerRef = useRef(null);
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !caseId) {
      setConnectionState("idle");
      return undefined;
    }

    const token = getAuthToken();
    if (!token) {
      setConnectionState("idle");
      return undefined;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socketUrl = `${protocol}://${new URL(api.defaults.baseURL).host}/ws/cases/${caseId}?token=${encodeURIComponent(token)}`;

      try {
        const socket = new WebSocket(socketUrl);
        socketRef.current = socket;
        setConnectionState("connecting");

        socket.onopen = () => {
          if (cancelled) return;
          setConnectionState("connected");
        };

        socket.onmessage = (event) => {
          if (cancelled) return;
          try {
            const payload = JSON.parse(event.data);
            onMessageRef.current?.(payload);
          } catch (error) {
            console.warn("Unable to parse case websocket payload.", error);
          }
        };

        socket.onerror = () => {
          if (cancelled) return;
          setConnectionState("error");
        };

        socket.onclose = () => {
          socketRef.current = null;
          if (cancelled) return;
          setConnectionState("disconnected");
          reconnectTimerRef.current = window.setTimeout(connect, 1500);
        };
      } catch (error) {
        console.warn("Unable to initialize case websocket.", error);
        setConnectionState("error");
        reconnectTimerRef.current = window.setTimeout(connect, 2000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      setConnectionState("idle");
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      try {
        socketRef.current?.close();
      } catch (error) {
        console.warn("Unable to close case websocket.", error);
      }
    };
  }, [caseId, enabled]);

  return {
    connectionState,
  };
}
