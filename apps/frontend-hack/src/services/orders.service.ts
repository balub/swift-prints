// Orders Service - Order management operations (participant view)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  API_BASE,
  apiRequest,
  queryKeys,
  type Order,
  type OrderStatus,
} from "./api-client";

// ============ Types ============

export interface CreateOrderRequest {
  uploadId: string;
  printerId: string;
  filamentId: string;
  teamNumber: string;
  participantName: string;
  participantEmail: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: OrderStatus;
  totalCost: number;
}

// Participant view response (limited fields)
export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  teamNumber: string;
  participantName: string;
  filename: string;
  printerName: string;
  filamentName: string;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// ============ API Functions ============

export async function createOrder(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getOrder(orderId: string): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`);
  if (!res.ok) {
    throw new Error("Order not found");
  }
  return res.json();
}

// ============ React Query Hooks ============

/**
 * Hook to get order details (participant view)
 */
export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 10000, // Refresh every 10 seconds for status updates
  });
}

/**
 * Hook to create a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      // Also invalidate admin orders
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.all });
    },
  });
}

