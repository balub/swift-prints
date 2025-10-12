/**
 * Enhanced Pricing Updates Hook
 * Provides real-time pricing updates via WebSocket with improved error handling
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./useWebSocket";
import { queryKeys } from "@/lib/query-keys";
import {
  PricingUpdateMessage,
  PricingBreakdown,
  PricingParams,
  WebSocketMessage,
} from "@/types/api";
import { toast } from "sonner";

export interface UsePricingUpdatesOptions {
  onPricingUpdate?: (pricing: PricingBreakdown, params: PricingParams) => void;
  onError?: (error: string) => void;
  enableAutoSubscription?: boolean;
  enableNotifications?: boolean;
}

export interface PricingUpdatesState {
  connected: boolean;
  error: string | null;
  subscribedCount: number;
  lastUpdate: Date | null;
}

export function usePricingUpdates(options: UsePricingUpdatesOptions = {}) {
  const {
    onPricingUpdate,
    onError,
    enableAutoSubscription = true,
    enableNotifications = false,
  } = options;

  const queryClient = useQueryClient();
  const subscribedParamsRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<PricingUpdatesState>({
    connected: false,
    error: null,
    subscribedCount: 0,
    lastUpdate: null,
  });

  const handleMessage = useCallback(
    (data: WebSocketMessage) => {
      try {
        if (data.type === "pricing_update") {
          const message = data as PricingUpdateMessage;
          const { params, pricing } = message.data;

          // Create cache key for this pricing calculation
          const cacheKey = queryKeys.pricing.calculate(params);

          // Update pricing cache
          queryClient.setQueryData(cacheKey, pricing);

          // Update any related pricing queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.pricing.all,
            exact: false,
          });

          // Update state
          setState((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            error: null,
          }));

          // Call custom callback
          onPricingUpdate?.(pricing, params);

          // Show notification if enabled
          if (enableNotifications) {
            toast.success("Pricing updated", {
              description: `New price: $${pricing.total.toFixed(2)}`,
            });
          }
        } else if (data.type === "pricing_error") {
          const errorMessage = data.data?.message || "Pricing update failed";
          setState((prev) => ({
            ...prev,
            error: errorMessage,
          }));
          onError?.(errorMessage);
        }
      } catch (error) {
        console.error("Error handling pricing message:", error);
        const errorMessage = "Failed to process pricing update";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    },
    [queryClient, onPricingUpdate, onError, enableNotifications]
  );

  const {
    connected,
    error: wsError,
    sendMessage,
  } = useWebSocket({
    url: "/ws/pricing",
    onMessage: handleMessage,
    onConnect: () => {
      setState((prev) => ({
        ...prev,
        connected: true,
        error: null,
      }));

      // Re-subscribe to all previously subscribed pricing parameters
      subscribedParamsRef.current.forEach((paramsKey) => {
        try {
          const params = JSON.parse(paramsKey);
          sendMessage({
            type: "subscribe_pricing",
            data: params,
          });
        } catch (error) {
          console.error("Error re-subscribing to pricing updates:", error);
        }
      });
    },
    onDisconnect: () => {
      setState((prev) => ({
        ...prev,
        connected: false,
      }));
    },
    onError: (error) => {
      const errorMessage = "WebSocket connection error";
      setState((prev) => ({
        ...prev,
        connected: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    },
  });

  const subscribeToPricing = useCallback(
    (params: PricingParams) => {
      if (connected) {
        const paramsKey = JSON.stringify(params);
        const wasSubscribed = subscribedParamsRef.current.has(paramsKey);

        subscribedParamsRef.current.add(paramsKey);

        sendMessage({
          type: "subscribe_pricing",
          data: params,
        });

        if (!wasSubscribed) {
          setState((prev) => ({
            ...prev,
            subscribedCount: subscribedParamsRef.current.size,
          }));
        }
      }
    },
    [connected, sendMessage]
  );

  const unsubscribeFromPricing = useCallback(
    (params: PricingParams) => {
      if (connected) {
        const paramsKey = JSON.stringify(params);
        const wasSubscribed = subscribedParamsRef.current.has(paramsKey);

        subscribedParamsRef.current.delete(paramsKey);

        sendMessage({
          type: "unsubscribe_pricing",
          data: params,
        });

        if (wasSubscribed) {
          setState((prev) => ({
            ...prev,
            subscribedCount: subscribedParamsRef.current.size,
          }));
        }
      }
    },
    [connected, sendMessage]
  );

  const requestPricingUpdate = useCallback(
    (params: PricingParams) => {
      if (connected) {
        sendMessage({
          type: "request_pricing",
          data: params,
        });
      }
    },
    [connected, sendMessage]
  );

  const unsubscribeFromAll = useCallback(() => {
    subscribedParamsRef.current.forEach((paramsKey) => {
      try {
        const params = JSON.parse(paramsKey);
        unsubscribeFromPricing(params);
      } catch (error) {
        console.error("Error unsubscribing from pricing:", error);
      }
    });
    subscribedParamsRef.current.clear();
    setState((prev) => ({
      ...prev,
      subscribedCount: 0,
    }));
  }, [unsubscribeFromPricing]);

  // Auto-subscribe to pricing updates when parameters change
  const autoSubscribeToPricing = useCallback(
    (params: PricingParams) => {
      if (enableAutoSubscription) {
        subscribeToPricing(params);
      }
    },
    [enableAutoSubscription, subscribeToPricing]
  );

  // Update connection state when WebSocket state changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      connected,
      error: wsError || prev.error,
    }));
  }, [connected, wsError]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubscribeFromAll();
    };
  }, [unsubscribeFromAll]);

  return {
    ...state,
    subscribeToPricing,
    unsubscribeFromPricing,
    requestPricingUpdate,
    autoSubscribeToPricing,
    unsubscribeFromAll,
  };
}

export default usePricingUpdates;
