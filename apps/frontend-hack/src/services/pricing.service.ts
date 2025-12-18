// Pricing Service - Cost estimation operations

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryKeys, type EstimateResponse } from "./api-client";

// ============ Types ============

export interface EstimateRequest {
  uploadId: string;
  printerId: string;
  filamentId: string;
  layerHeight?: number;
  infill?: number;
  supports?: "none" | "auto" | "everywhere";
}

// ============ API Functions ============

export async function getEstimate(
  request: EstimateRequest
): Promise<EstimateResponse> {
  return apiRequest<EstimateResponse>("/pricing/estimate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getQuickEstimate(
  uploadId: string,
  printerId: string,
  filamentId: string
): Promise<EstimateResponse> {
  const params = new URLSearchParams({ uploadId, printerId, filamentId });
  return apiRequest<EstimateResponse>(`/pricing/quick-estimate?${params}`);
}

// ============ React Query Hooks ============

/**
 * Hook to get a quick estimate (GET request)
 */
export function useQuickEstimate(
  uploadId: string | undefined,
  printerId: string | undefined,
  filamentId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.pricing.quickEstimate(uploadId!, printerId!, filamentId!),
    queryFn: () => getQuickEstimate(uploadId!, printerId!, filamentId!),
    enabled: !!uploadId && !!printerId && !!filamentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get a detailed estimate (POST request with options)
 */
export function useEstimate() {
  return useMutation({
    mutationFn: getEstimate,
  });
}

/**
 * Hook to get estimate with query (for when you want to cache by parameters)
 */
export function useEstimateQuery(request: EstimateRequest | null) {
  return useQuery({
    queryKey: request
      ? queryKeys.pricing.estimate(
          request.uploadId,
          request.printerId,
          request.filamentId
        )
      : ["pricing", "estimate", "disabled"],
    queryFn: () => getEstimate(request!),
    enabled: !!request,
    staleTime: 2 * 60 * 1000,
  });
}

