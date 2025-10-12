/**
 * Real-time Service
 * Manages WebSocket connections and provides fallback to polling
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import apiClient from "@/lib/api-client";
import {
  OrderResponse,
  PricingBreakdown,
  PricingParams,
  AnalysisResult,
  OrderStatus,
} from "@/types/api";

export interface RealTimeServiceOptions {
  enableWebSocket?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  maxPollingRetries?: number;
}

export interface RealTimeServiceState {
  webSocketConnected: boolean;
  pollingActive: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

export function useRealTimeService(options: RealTimeServiceOptions = {}) {
  const {
    enableWebSocket = true,
    enablePolling = true,
    pollingInterval = 30000, // 30 seconds
    maxPollingRetries = 3,
  } = options;

  const queryClient = useQueryClient();
  const { online } = useNetworkStatus();
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRetriesRef = useRef(0);
  const subscribedOrdersRef = useRef<Set<string>>(new Set());
  const subscribedPricingRef = useRef<Set<string>>(new Set());
  const subscribedAnalysisRef = useRef<Set<string>>(new Set());

  const [state, setState] = useState<RealTimeServiceState>({
    webSocketConnected: false,
    pollingActive: false,
    lastUpdate: null,
    error: null,
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data: any) => {
    setState((prev) => ({ ...prev, lastUpdate: new Date(), error: null }));

    switch (data.type) {
      case "order_update":
        handleOrderUpdate(data.data);
        break;
      case "pricing_update":
        handlePricingUpdate(data.data);
        break;
      case "analysis_update":
        handleAnalysisUpdate(data.data);
        break;
      default:
        console.log("Unknown WebSocket message type:", data.type);
    }
  }, []);

  // WebSocket connection
  const webSocket = useWebSocket({
    url: "/ws/realtime",
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      setState((prev) => ({ ...prev, webSocketConnected: true, error: null }));
      stopPolling(); // Stop polling when WebSocket connects

      // Re-subscribe to all active subscriptions
      resubscribeAll();
    },
    onDisconnect: () => {
      setState((prev) => ({ ...prev, webSocketConnected: false }));

      // Start polling as fallback if enabled
      if (enablePolling && online) {
        startPolling();
      }
    },
    onError: () => {
      setState((prev) => ({
        ...prev,
        webSocketConnected: false,
        error: "WebSocket connection failed",
      }));
    },
  });

  // Order update handler
  const handleOrderUpdate = useCallback(
    (data: { order_id: string; status: OrderStatus; order: OrderResponse }) => {
      const { order_id, order } = data;

      // Update specific order cache
      queryClient.setQueryData(["order", order_id], order);

      // Update orders list cache
      queryClient.setQueryData(["orders"], (oldData: any) => {
        if (!oldData?.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((existingOrder: OrderResponse) =>
            existingOrder.id === order_id ? order : existingOrder
          ),
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-stats"] });
    },
    [queryClient]
  );

  // Pricing update handler
  const handlePricingUpdate = useCallback(
    (data: { params: PricingParams; pricing: PricingBreakdown }) => {
      const { params, pricing } = data;
      const cacheKey = ["pricing", params];

      queryClient.setQueryData(cacheKey, pricing);
      queryClient.invalidateQueries({ queryKey: ["pricing"], exact: false });
    },
    [queryClient]
  );

  // Analysis update handler
  const handleAnalysisUpdate = useCallback(
    (data: {
      job_id: string;
      status: string;
      progress?: number;
      result?: AnalysisResult;
    }) => {
      const { job_id, status, progress, result } = data;

      // Update analysis status cache
      queryClient.setQueryData(["analysis-status", job_id], {
        job_id,
        status,
        progress,
        result,
      });

      if (status === "completed" && result) {
        queryClient.setQueryData(["analysis", result.id], result);
        queryClient.invalidateQueries({ queryKey: ["analysis"] });
      }
    },
    [queryClient]
  );

  // Re-subscribe to all active subscriptions
  const resubscribeAll = useCallback(() => {
    if (!webSocket.connected) return;

    // Re-subscribe to orders
    subscribedOrdersRef.current.forEach((orderId) => {
      webSocket.sendMessage({
        type: "subscribe_order",
        data: { order_id: orderId },
      });
    });

    // Re-subscribe to pricing
    subscribedPricingRef.current.forEach((paramsKey) => {
      try {
        const params = JSON.parse(paramsKey);
        webSocket.sendMessage({
          type: "subscribe_pricing",
          data: params,
        });
      } catch (error) {
        console.error("Error re-subscribing to pricing:", error);
      }
    });

    // Re-subscribe to analysis
    subscribedAnalysisRef.current.forEach((jobId) => {
      webSocket.sendMessage({
        type: "subscribe_analysis",
        data: { job_id: jobId },
      });
    });
  }, [webSocket]);

  // Polling fallback
  const pollUpdates = useCallback(async () => {
    if (!online) {
      setState((prev) => ({ ...prev, pollingActive: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, pollingActive: true, error: null }));

      // Poll order updates
      if (subscribedOrdersRef.current.size > 0) {
        const orderIds = Array.from(subscribedOrdersRef.current);
        const orderPromises = orderIds.map((orderId) =>
          apiClient.get<OrderResponse>(`/api/orders/${orderId}`)
        );

        const orderResults = await Promise.allSettled(orderPromises);
        orderResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const orderId = orderIds[index];
            const order = result.value.data;
            handleOrderUpdate({
              order_id: orderId,
              status: order.status,
              order,
            });
          }
        });
      }

      // Poll pricing updates
      if (subscribedPricingRef.current.size > 0) {
        const pricingParams = Array.from(subscribedPricingRef.current);
        const pricingPromises = pricingParams.map((paramsKey) => {
          try {
            const params = JSON.parse(paramsKey);
            return apiClient.post<PricingBreakdown>(
              "/api/pricing/calculate",
              params
            );
          } catch (error) {
            return Promise.reject(error);
          }
        });

        const pricingResults = await Promise.allSettled(pricingPromises);
        pricingResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const paramsKey = pricingParams[index];
            const params = JSON.parse(paramsKey);
            const pricing = result.value.data;
            handlePricingUpdate({ params, pricing });
          }
        });
      }

      // Poll analysis updates
      if (subscribedAnalysisRef.current.size > 0) {
        const jobIds = Array.from(subscribedAnalysisRef.current);
        const analysisPromises = jobIds.map((jobId) =>
          apiClient.get(`/api/analysis/status/${jobId}`)
        );

        const analysisResults = await Promise.allSettled(analysisPromises);
        analysisResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const jobId = jobIds[index];
            const statusData = result.value.data;
            handleAnalysisUpdate({
              job_id: jobId,
              status: statusData.status,
              progress: statusData.progress,
              result: statusData.result,
            });
          }
        });
      }

      setState((prev) => ({ ...prev, lastUpdate: new Date() }));
      pollingRetriesRef.current = 0;

      // Schedule next poll
      pollingTimeoutRef.current = setTimeout(pollUpdates, pollingInterval);
    } catch (error) {
      console.error("Polling error:", error);
      pollingRetriesRef.current++;

      setState((prev) => ({
        ...prev,
        error: "Polling failed",
        pollingActive: false,
      }));

      // Retry polling with exponential backoff
      if (pollingRetriesRef.current < maxPollingRetries) {
        const retryDelay = Math.min(
          pollingInterval * Math.pow(2, pollingRetriesRef.current),
          60000
        );
        pollingTimeoutRef.current = setTimeout(pollUpdates, retryDelay);
      }
    }
  }, [
    online,
    pollingInterval,
    maxPollingRetries,
    handleOrderUpdate,
    handlePricingUpdate,
    handleAnalysisUpdate,
  ]);

  const startPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    pollingRetriesRef.current = 0;
    pollUpdates();
  }, [pollUpdates]);

  const stopPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setState((prev) => ({ ...prev, pollingActive: false }));
  }, []);

  // Public API methods
  const subscribeToOrder = useCallback(
    (orderId: string) => {
      subscribedOrdersRef.current.add(orderId);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "subscribe_order",
          data: { order_id: orderId },
        });
      } else if (enablePolling && !state.pollingActive) {
        startPolling();
      }
    },
    [webSocket, enablePolling, state.pollingActive, startPolling]
  );

  const unsubscribeFromOrder = useCallback(
    (orderId: string) => {
      subscribedOrdersRef.current.delete(orderId);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "unsubscribe_order",
          data: { order_id: orderId },
        });
      }
    },
    [webSocket]
  );

  const subscribeToPricing = useCallback(
    (params: PricingParams) => {
      const paramsKey = JSON.stringify(params);
      subscribedPricingRef.current.add(paramsKey);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "subscribe_pricing",
          data: params,
        });
      } else if (enablePolling && !state.pollingActive) {
        startPolling();
      }
    },
    [webSocket, enablePolling, state.pollingActive, startPolling]
  );

  const unsubscribeFromPricing = useCallback(
    (params: PricingParams) => {
      const paramsKey = JSON.stringify(params);
      subscribedPricingRef.current.delete(paramsKey);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "unsubscribe_pricing",
          data: params,
        });
      }
    },
    [webSocket]
  );

  const subscribeToAnalysis = useCallback(
    (jobId: string) => {
      subscribedAnalysisRef.current.add(jobId);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "subscribe_analysis",
          data: { job_id: jobId },
        });
      } else if (enablePolling && !state.pollingActive) {
        startPolling();
      }
    },
    [webSocket, enablePolling, state.pollingActive, startPolling]
  );

  const unsubscribeFromAnalysis = useCallback(
    (jobId: string) => {
      subscribedAnalysisRef.current.delete(jobId);

      if (webSocket.connected) {
        webSocket.sendMessage({
          type: "unsubscribe_analysis",
          data: { job_id: jobId },
        });
      }
    },
    [webSocket]
  );

  // Handle network status changes
  useEffect(() => {
    if (!online) {
      stopPolling();
    } else if (
      !webSocket.connected &&
      enablePolling &&
      (subscribedOrdersRef.current.size > 0 ||
        subscribedPricingRef.current.size > 0 ||
        subscribedAnalysisRef.current.size > 0)
    ) {
      startPolling();
    }
  }, [online, webSocket.connected, enablePolling, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      subscribedOrdersRef.current.clear();
      subscribedPricingRef.current.clear();
      subscribedAnalysisRef.current.clear();
    };
  }, [stopPolling]);

  return {
    ...state,
    subscribeToOrder,
    unsubscribeFromOrder,
    subscribeToPricing,
    unsubscribeFromPricing,
    subscribeToAnalysis,
    unsubscribeFromAnalysis,
    reconnect: webSocket.reconnect,
  };
}

export default useRealTimeService;
