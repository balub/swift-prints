// Admin Service - Admin operations for orders, printers, and filaments

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  queryKeys,
  type Order,
  type OrderStatus,
  type OrderStats,
  type Printer,
  type Filament,
} from "./api-client";

// ============ Types ============

export interface AdminOrderFilters {
  status?: OrderStatus;
  teamNumber?: string;
}

export interface CreatePrinterRequest {
  name: string;
  hourlyRate: number;
  filaments?: CreateFilamentRequest[];
}

export interface CreateFilamentRequest {
  filamentType: string;
  name: string;
  pricePerGram: number;
}

export interface UpdatePrinterRequest {
  name?: string;
  hourlyRate?: number;
  isActive?: boolean;
}

export interface UpdateFilamentRequest {
  name?: string;
  pricePerGram?: number;
  isActive?: boolean;
}

// Admin order response (full details)
export interface AdminOrderResponse {
  orderId: string;
  status: OrderStatus;
  teamNumber: string;
  participantName: string;
  participantEmail: string;
  filename: string;
  fileUrl: string;
  printerId: string;
  printerName: string;
  filamentId: string;
  filamentName: string;
  filamentUsedGrams: number;
  printTimeHours: number;
  materialCost: number;
  machineTimeCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// Admin order list item
export interface AdminOrderListItem {
  orderId: string;
  status: OrderStatus;
  teamNumber: string;
  participantName: string;
  participantEmail: string;
  filename: string;
  printerName: string;
  filamentName: string;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// ============ API Functions - Orders ============

export async function getAdminOrders(
  filters?: AdminOrderFilters
): Promise<AdminOrderListItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.teamNumber) params.append("teamNumber", filters.teamNumber);

  const queryString = params.toString();
  const endpoint = queryString ? `/admin/orders?${queryString}` : "/admin/orders";
  return apiRequest<AdminOrderListItem[]>(endpoint);
}

export async function getOrderStats(): Promise<OrderStats> {
  return apiRequest<OrderStats>("/admin/orders/stats");
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderResponse> {
  return apiRequest<AdminOrderResponse>(`/admin/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<AdminOrderResponse> {
  return apiRequest<AdminOrderResponse>(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ============ API Functions - Printers ============

export async function getAdminPrinters(): Promise<Printer[]> {
  return apiRequest<Printer[]>("/admin/printers");
}

export async function createPrinter(
  request: CreatePrinterRequest
): Promise<Printer> {
  return apiRequest<Printer>("/admin/printers", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updatePrinter(
  printerId: string,
  data: UpdatePrinterRequest
): Promise<Printer> {
  return apiRequest<Printer>(`/admin/printers/${printerId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ============ API Functions - Filaments ============

export async function addFilament(
  printerId: string,
  filament: CreateFilamentRequest
): Promise<Filament> {
  return apiRequest<Filament>(`/admin/printers/${printerId}/filaments`, {
    method: "POST",
    body: JSON.stringify(filament),
  });
}

export async function updateFilament(
  filamentId: string,
  data: UpdateFilamentRequest
): Promise<Filament> {
  return apiRequest<Filament>(`/admin/filaments/${filamentId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ============ React Query Hooks - Orders ============

/**
 * Hook to get all admin orders with optional filters
 */
export function useAdminOrders(filters?: AdminOrderFilters) {
  return useQuery({
    queryKey: filters
      ? queryKeys.admin.orders.filtered(filters)
      : queryKeys.admin.orders.all,
    queryFn: () => getAdminOrders(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to get order statistics
 */
export function useOrderStats() {
  return useQuery({
    queryKey: queryKeys.admin.orders.stats,
    queryFn: getOrderStats,
    refetchInterval: 30000,
  });
}

/**
 * Hook to get admin order details
 */
export function useAdminOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.orders.detail(orderId!),
    queryFn: () => getAdminOrder(orderId!),
    enabled: !!orderId,
  });
}

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.orders.detail(variables.orderId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders.stats });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
    },
  });
}

// ============ React Query Hooks - Printers ============

/**
 * Hook to get all admin printers
 */
export function useAdminPrinters() {
  return useQuery({
    queryKey: queryKeys.admin.printers.all,
    queryFn: getAdminPrinters,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new printer
 */
export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPrinter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.printers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.printers.all });
    },
  });
}

/**
 * Hook to update a printer
 */
export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      printerId,
      data,
    }: {
      printerId: string;
      data: UpdatePrinterRequest;
    }) => updatePrinter(printerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.printers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.printers.detail(variables.printerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.printers.all });
    },
  });
}

// ============ React Query Hooks - Filaments ============

/**
 * Hook to add a filament to a printer
 */
export function useAddFilament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      printerId,
      filament,
    }: {
      printerId: string;
      filament: CreateFilamentRequest;
    }) => addFilament(printerId, filament),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.printers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.printers.detail(variables.printerId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.printers.all });
    },
  });
}

/**
 * Hook to update a filament
 */
export function useUpdateFilament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      filamentId,
      data,
    }: {
      filamentId: string;
      data: UpdateFilamentRequest;
    }) => updateFilament(filamentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.printers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.printers.all });
    },
  });
}

