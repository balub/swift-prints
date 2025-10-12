/**
 * Order Updates Hook
 * Provides real-time order status updates via WebSocket
 */
import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./useWebSocket";
import { OrderUpdateMessage, OrderResponse, OrderStatus } from "@/types/api";
import { toast } from "sonner";

export interface UseOrderUpdatesOptions {
  orderId?: string;
  onOrderUpdate?: (order: OrderResponse) => void;
  enableNotifications?: boolean;
}

export function useOrderUpdates(options: UseOrderUpdatesOptions = {}) {
  const { orderId, onOrderUpdate, enableNotifications = true } = options;
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (data: any) => {
      if (data.type === "order_update") {
        const message = data as OrderUpdateMessage;
        const { order_id, status, order } = message.data;

        // Update specific order in cache
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

        // Invalidate related queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["order-stats"] });

        // Call custom callback
        onOrderUpdate?.(order);

        // Show notification if enabled
        if (enableNotifications) {
          const statusMessages = {
            [OrderStatus.ASSIGNED]: "Your order has been assigned to a maker",
            [OrderStatus.IN_PROGRESS]: "Your order is now being printed",
            [OrderStatus.COMPLETED]: "Your order has been completed!",
            [OrderStatus.CANCELLED]: "Your order has been cancelled",
          };

          const message = statusMessages[status];
          if (message) {
            const toastType =
              status === OrderStatus.COMPLETED ? "success" : "info";
            toast[toastType](`Order ${order_id.slice(-8)}`, {
              description: message,
            });
          }
        }
      }
    },
    [queryClient, onOrderUpdate, enableNotifications]
  );

  const { connected, error, sendMessage } = useWebSocket({
    url: "/ws/orders",
    onMessage: handleMessage,
    onConnect: () => {
      // Subscribe to specific order updates if orderId is provided
      if (orderId) {
        sendMessage({
          type: "subscribe",
          data: { order_id: orderId },
        });
      }
    },
  });

  // Subscribe to specific order when orderId changes
  useEffect(() => {
    if (connected && orderId) {
      sendMessage({
        type: "subscribe",
        data: { order_id: orderId },
      });
    }
  }, [connected, orderId, sendMessage]);

  const subscribeToOrder = useCallback(
    (orderIdToSubscribe: string) => {
      if (connected) {
        sendMessage({
          type: "subscribe",
          data: { order_id: orderIdToSubscribe },
        });
      }
    },
    [connected, sendMessage]
  );

  const unsubscribeFromOrder = useCallback(
    (orderIdToUnsubscribe: string) => {
      if (connected) {
        sendMessage({
          type: "unsubscribe",
          data: { order_id: orderIdToUnsubscribe },
        });
      }
    },
    [connected, sendMessage]
  );

  return {
    connected,
    error,
    subscribeToOrder,
    unsubscribeFromOrder,
  };
}

export default useOrderUpdates;
