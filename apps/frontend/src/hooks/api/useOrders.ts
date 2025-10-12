/**
 * Order API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  OrderCreate,
  OrderResponse,
  OrderSummary,
  OrderSearchFilters,
  OrderStats,
  OrderStatusUpdate,
  OrderAssignment,
  OrderCancellation,
  OrderRating,
  OrderUpdate,
  UserRole,
  PaginatedResponse,
} from "@/types/api";
import { toast } from "sonner";

// Order queries
export function useOrders(filters: OrderSearchFilters = {}) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<OrderResponse>>(
        "/api/orders",
        {
          params: filters,
        }
      );
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds (orders change frequently)
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<OrderResponse>(
        `/api/orders/${orderId}`
      );
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch for real-time updates
  });
}

export function useOrderStats(role: UserRole) {
  return useQuery({
    queryKey: queryKeys.orders.stats(role),
    queryFn: async () => {
      const response = await apiClient.get<OrderStats>("/api/orders/stats");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePendingOrdersForMakers() {
  return useQuery({
    queryKey: queryKeys.orders.pending(),
    queryFn: async () => {
      const response = await apiClient.get<OrderSummary[]>(
        "/api/orders/maker/pending"
      );
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch for real-time updates
  });
}

// Order mutations
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrderCreate) => {
      const response = await apiClient.post<OrderResponse>("/api/orders", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate orders list to show new order
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

      // Add new order to cache
      queryClient.setQueryData(queryKeys.orders.detail(data.id), data);

      toast.success("Order created successfully!", {
        description: `Order #${data.id.slice(-8)} has been submitted`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to create order", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      update,
    }: {
      orderId: string;
      update: OrderStatusUpdate;
    }) => {
      const response = await apiClient.put<OrderResponse>(
        `/api/orders/${orderId}/status`,
        update
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update order in cache
      queryClient.setQueryData(
        queryKeys.orders.detail(variables.orderId),
        data
      );

      // Invalidate orders list to reflect status change
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      toast.success("Order status updated", {
        description: `Order is now ${data.status}`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to update order status", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useAssignOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      assignment,
    }: {
      orderId: string;
      assignment: OrderAssignment;
    }) => {
      const response = await apiClient.post<OrderResponse>(
        `/api/orders/${orderId}/assign`,
        assignment
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update order in cache
      queryClient.setQueryData(
        queryKeys.orders.detail(variables.orderId),
        data
      );

      // Invalidate orders lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.pending() });

      toast.success("Order assigned successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to assign order", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useAcceptOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      estimatedCompletion,
    }: {
      orderId: string;
      estimatedCompletion?: string;
    }) => {
      const response = await apiClient.post(`/api/orders/${orderId}/accept`, {
        estimated_completion: estimatedCompletion,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update order in cache
      if (data.order) {
        queryClient.setQueryData(
          queryKeys.orders.detail(variables.orderId),
          data.order
        );
      }

      // Invalidate orders lists
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.pending() });

      toast.success("Order accepted successfully!", {
        description: "The customer will be notified",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to accept order", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      cancellation,
    }: {
      orderId: string;
      cancellation: OrderCancellation;
    }) => {
      const response = await apiClient.post<OrderResponse>(
        `/api/orders/${orderId}/cancel`,
        cancellation
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update order in cache
      queryClient.setQueryData(
        queryKeys.orders.detail(variables.orderId),
        data
      );

      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

      toast.success("Order cancelled successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to cancel order", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      update,
    }: {
      orderId: string;
      update: OrderUpdate;
    }) => {
      const response = await apiClient.put<OrderResponse>(
        `/api/orders/${orderId}`,
        update
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update order in cache
      queryClient.setQueryData(
        queryKeys.orders.detail(variables.orderId),
        data
      );

      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

      toast.success("Order updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update order", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useRateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      rating,
    }: {
      orderId: string;
      rating: OrderRating;
    }) => {
      const response = await apiClient.post(
        `/api/orders/${orderId}/rate`,
        rating
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate order to refetch with rating
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });

      // Invalidate maker data to update rating
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.all });

      toast.success("Thank you for your rating!");
    },
    onError: (error: any) => {
      toast.error("Failed to submit rating", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}
