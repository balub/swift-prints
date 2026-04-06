// Printers Service - Printer and filament operations

import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryKeys, type Printer } from "./api-client";

// ============ API Functions ============

export async function getPrinters(): Promise<Printer[]> {
  return apiRequest<Printer[]>("/printers");
}

export async function getPrinter(printerId: string): Promise<Printer> {
  return apiRequest<Printer>(`/printers/${printerId}`);
}

// ============ React Query Hooks ============

/**
 * Hook to get all available printers
 */
export function usePrinters() {
  return useQuery({
    queryKey: queryKeys.printers.all,
    queryFn: getPrinters,
    staleTime: 5 * 60 * 1000, // 5 minutes - printers don't change often
  });
}

/**
 * Hook to get a specific printer by ID
 */
export function usePrinter(printerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.printers.detail(printerId!),
    queryFn: () => getPrinter(printerId!),
    enabled: !!printerId,
    staleTime: 5 * 60 * 1000,
  });
}

