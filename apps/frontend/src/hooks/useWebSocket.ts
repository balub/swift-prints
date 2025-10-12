/**
 * WebSocket Hook
 * Provides WebSocket connection with automatic reconnection logic
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNetworkStatus } from "./useNetworkStatus";
import { toast } from "sonner";

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableLogging?: boolean;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    enableLogging = process.env.NODE_ENV === "development",
  } = options;

  const { session } = useAuth();
  const { online } = useNetworkStatus();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    lastConnected: null,
  });

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (enableLogging) {
        console.log(`[WebSocket] ${message}`, ...args);
      }
    },
    [enableLogging]
  );

  const calculateReconnectDelay = useCallback(
    (attempt: number): number => {
      // Exponential backoff with jitter
      const baseDelay = reconnectInterval;
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        30000
      );
      const jitter = Math.random() * 1000;
      return exponentialDelay + jitter;
    },
    [reconnectInterval]
  );

  const connect = useCallback(() => {
    if (!session?.access_token || !online) {
      log("Cannot connect: no auth token or offline");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      log("Already connecting");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log("Already connected");
      return;
    }

    setState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      // Construct WebSocket URL with auth token
      const wsUrl = new URL(url, window.location.origin);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      wsUrl.searchParams.set("token", session.access_token);

      log("Connecting to:", wsUrl.toString());

      const ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        log("Connected successfully");
        reconnectAttemptsRef.current = 0;
        setState((prev) => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
          lastConnected: new Date(),
        }));
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          log("Received message:", data);
          onMessage?.(data);
        } catch (error) {
          log("Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        log("WebSocket error:", error);
        setState((prev) => ({
          ...prev,
          error: "Connection error occurred",
          connecting: false,
        }));
        onError?.(error);
      };

      ws.onclose = (event) => {
        log("Connection closed:", event.code, event.reason);
        setState((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
        }));
        onDisconnect?.();

        // Attempt reconnection if needed
        if (
          shouldReconnectRef.current &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          online
        ) {
          const delay = calculateReconnectDelay(reconnectAttemptsRef.current);
          log(
            `Reconnecting in ${delay}ms (attempt ${
              reconnectAttemptsRef.current + 1
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setState((prev) => ({
              ...prev,
              reconnectAttempts: reconnectAttemptsRef.current,
            }));
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          log("Max reconnection attempts reached");
          setState((prev) => ({
            ...prev,
            error: "Failed to reconnect after multiple attempts",
          }));
          toast.error("Connection lost", {
            description: "Unable to reconnect to real-time updates",
          });
        }
      };

      wsRef.current = ws;
    } catch (error) {
      log("Error creating WebSocket:", error);
      setState((prev) => ({
        ...prev,
        connecting: false,
        error: "Failed to create connection",
      }));
    }
  }, [
    session?.access_token,
    online,
    url,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    maxReconnectAttempts,
    calculateReconnectDelay,
    log,
  ]);

  const disconnect = useCallback(() => {
    log("Disconnecting");
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    }));
  }, [log]);

  const sendMessage = useCallback(
    (data: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const message = JSON.stringify(data);
          log("Sending message:", data);
          wsRef.current.send(message);
          return true;
        } catch (error) {
          log("Error sending message:", error);
          return false;
        }
      } else {
        log("Cannot send message: WebSocket not connected");
        return false;
      }
    },
    [log]
  );

  const reconnect = useCallback(() => {
    log("Manual reconnect requested");
    disconnect();
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect, log]);

  // Connect when auth token is available and online
  useEffect(() => {
    if (session?.access_token && online) {
      shouldReconnectRef.current = true;
      connect();
    } else {
      disconnect();
    }

    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [session?.access_token, online, connect, disconnect]);

  // Handle network status changes
  useEffect(() => {
    if (
      online &&
      session?.access_token &&
      !state.connected &&
      !state.connecting
    ) {
      log("Network restored, attempting to reconnect");
      reconnect();
    }
  }, [
    online,
    session?.access_token,
    state.connected,
    state.connecting,
    reconnect,
    log,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    sendMessage,
    reconnect,
    disconnect,
  };
}

export default useWebSocket;
