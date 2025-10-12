/**
 * Maker Updates Hook
 * Provides real-time maker availability and capacity updates via WebSocket
 */
import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./useWebSocket";
import { MakerPublicResponse, MakerResponse, CapacityInfo } from "@/types/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export interface MakerUpdateMessage {
  type: "maker_update";
  data: {
    maker_id: string;
    field: "availability" | "capacity" | "profile";
    value: any;
    maker?: MakerPublicResponse | MakerResponse;
  };
}

export interface UseMakerUpdatesOptions {
  makerId?: string;
  onMakerUpdate?: (maker: MakerPublicResponse | MakerResponse) => void;
  enableNotifications?: boolean;
}

export function useMakerUpdates(options: UseMakerUpdatesOptions = {}) {
  const { makerId, onMakerUpdate, enableNotifications = true } = options;
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (data: any) => {
      if (data.type === "maker_update") {
        const message = data as MakerUpdateMessage;
        const { maker_id, field, value, maker } = message.data;

        // Update specific maker in cache
        if (maker) {
          queryClient.setQueryData(queryKeys.makers.detail(maker_id), maker);
          queryClient.setQueryData(queryKeys.makers.me(), maker);
        }

        // Update specific fields in cache
        switch (field) {
          case "availability":
            // Update availability in all relevant caches
            queryClient.setQueryData(
              queryKeys.makers.detail(maker_id),
              (oldData: any) => {
                if (oldData) {
                  return { ...oldData, available: value };
                }
                return oldData;
              }
            );

            // Update in makers list
            queryClient.setQueriesData(
              { queryKey: queryKeys.makers.lists() },
              (oldData: any) => {
                if (!oldData?.data) return oldData;

                return {
                  ...oldData,
                  data: oldData.data.map((existingMaker: MakerPublicResponse) =>
                    existingMaker.id === maker_id
                      ? { ...existingMaker, available: value }
                      : existingMaker
                  ),
                };
              }
            );

            if (enableNotifications) {
              toast.info(
                `Maker availability ${value ? "enabled" : "disabled"}`,
                {
                  description: maker
                    ? `${maker.name} is now ${
                        value ? "available" : "unavailable"
                      } for orders`
                    : undefined,
                }
              );
            }
            break;

          case "capacity":
            // Update capacity info
            queryClient.setQueryData(
              queryKeys.makers.capacity(maker_id),
              value as CapacityInfo
            );
            break;

          case "profile":
            // Invalidate all maker-related queries to refetch fresh data
            queryClient.invalidateQueries({
              queryKey: queryKeys.makers.detail(maker_id),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
            queryClient.invalidateQueries({
              queryKey: queryKeys.makers.lists(),
            });
            break;
        }

        // Call custom callback
        if (maker) {
          onMakerUpdate?.(maker);
        }

        // Invalidate related queries to ensure consistency
        queryClient.invalidateQueries({ queryKey: queryKeys.makers.lists() });
      }
    },
    [queryClient, onMakerUpdate, enableNotifications]
  );

  const { connected, error, sendMessage } = useWebSocket({
    url: "/ws/makers",
    onMessage: handleMessage,
    onConnect: () => {
      // Subscribe to specific maker updates if makerId is provided
      if (makerId) {
        sendMessage({
          type: "subscribe",
          data: { maker_id: makerId },
        });
      }
    },
  });

  // Subscribe to specific maker when makerId changes
  useEffect(() => {
    if (connected && makerId) {
      sendMessage({
        type: "subscribe",
        data: { maker_id: makerId },
      });
    }
  }, [connected, makerId, sendMessage]);

  const subscribeToMaker = useCallback(
    (makerIdToSubscribe: string) => {
      if (connected) {
        sendMessage({
          type: "subscribe",
          data: { maker_id: makerIdToSubscribe },
        });
      }
    },
    [connected, sendMessage]
  );

  const unsubscribeFromMaker = useCallback(
    (makerIdToUnsubscribe: string) => {
      if (connected) {
        sendMessage({
          type: "unsubscribe",
          data: { maker_id: makerIdToUnsubscribe },
        });
      }
    },
    [connected, sendMessage]
  );

  const updateMakerAvailability = useCallback(
    (makerIdToUpdate: string, available: boolean) => {
      if (connected) {
        sendMessage({
          type: "update_availability",
          data: { maker_id: makerIdToUpdate, available },
        });
      }
    },
    [connected, sendMessage]
  );

  return {
    connected,
    error,
    subscribeToMaker,
    unsubscribeFromMaker,
    updateMakerAvailability,
  };
}

export default useMakerUpdates;
