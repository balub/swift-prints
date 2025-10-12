/**
 * Pricing API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  PricingBreakdown,
  PricingRequest,
  PricingParams,
  MarketRates,
  PriceComparisonRequest,
  MakerPriceComparison,
  QuoteRequest,
  Quote,
  PricingConfig,
  PricingSession,
  PricingUpdateRequest,
} from "@/types/api";
import { toast } from "sonner";

// Pricing calculation
export function useCalculatePricing() {
  return useMutation({
    mutationFn: async (request: PricingRequest) => {
      const response = await apiClient.post<PricingBreakdown>(
        "/api/pricing/calculate",
        request
      );
      return response.data;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to calculate pricing";
      toast.error("Pricing Error", {
        description: message,
      });
    },
  });
}

// Market rates query
export function useMarketRates(
  materialType: string,
  locationLat?: number,
  locationLng?: number
) {
  return useQuery({
    queryKey: queryKeys.pricing.rates(materialType, locationLat, locationLng),
    queryFn: async () => {
      const response = await apiClient.get<MarketRates>("/api/pricing/rates", {
        params: {
          material_type: materialType,
          location_lat: locationLat,
          location_lng: locationLng,
        },
      });
      return response.data;
    },
    enabled:
      !!materialType && locationLat !== undefined && locationLng !== undefined,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
}

// Price comparison across multiple makers
export function useComparePrices() {
  return useMutation({
    mutationFn: async (request: PriceComparisonRequest) => {
      const response = await apiClient.post<MakerPriceComparison[]>(
        "/api/pricing/compare",
        request
      );
      return response.data;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to compare prices";
      toast.error("Price Comparison Error", {
        description: message,
      });
    },
  });
}

// Generate detailed quote
export function useGenerateQuote() {
  return useMutation({
    mutationFn: async (request: QuoteRequest) => {
      const response = await apiClient.post<Quote>(
        "/api/pricing/quote",
        request
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Quote generated successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to generate quote";
      toast.error("Quote Generation Error", {
        description: message,
      });
    },
  });
}

// Get existing quote
export function useQuote(quoteId: string) {
  return useQuery({
    queryKey: queryKeys.pricing.quote(quoteId),
    queryFn: async () => {
      const response = await apiClient.get<Quote>(
        `/api/pricing/quote/${quoteId}`
      );
      return response.data;
    },
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Apply discount code
export function useApplyDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      discountCode,
    }: {
      quoteId: string;
      discountCode: string;
    }) => {
      const response = await apiClient.post("/api/pricing/apply-discount", {
        quote_id: quoteId,
        discount_code: discountCode,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update quote cache with new pricing
      queryClient.setQueryData(
        queryKeys.pricing.quote(variables.quoteId),
        (oldData: Quote | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              pricing: data.updated_pricing,
            };
          }
          return oldData;
        }
      );
      toast.success("Discount applied successfully!");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to apply discount";
      toast.error("Discount Error", {
        description: message,
      });
    },
  });
}

// Get pricing configuration
export function usePricingConfig() {
  return useQuery({
    queryKey: queryKeys.pricing.config(),
    queryFn: async () => {
      const response = await apiClient.get<PricingConfig>(
        "/api/pricing/config"
      );
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour (config doesn't change often)
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
  });
}

// Create pricing session for real-time updates
export function useCreatePricingSession() {
  return useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await apiClient.post<PricingSession>(
        "/api/pricing/session",
        { analysis_id: analysisId }
      );
      return response.data;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to create pricing session";
      toast.error("Session Error", {
        description: message,
      });
    },
  });
}

// Update pricing session
export function useUpdatePricingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      updates,
    }: {
      sessionId: string;
      updates: PricingUpdateRequest;
    }) => {
      const response = await apiClient.put<PricingBreakdown>(
        `/api/pricing/session/${sessionId}`,
        updates
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update session cache with new pricing
      queryClient.setQueryData(
        queryKeys.pricing.session(variables.sessionId),
        (oldData: PricingSession | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              current_pricing: data,
            };
          }
          return oldData;
        }
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to update pricing";
      toast.error("Update Error", {
        description: message,
      });
    },
  });
}

// Get pricing session
export function usePricingSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.pricing.session(sessionId),
    queryFn: async () => {
      const response = await apiClient.get<PricingSession>(
        `/api/pricing/session/${sessionId}`
      );
      return response.data;
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds (sessions are dynamic)
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Cached pricing calculation with optimistic updates
export function useCachedPricing(params: PricingParams) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.pricing.calculate(params),
    queryFn: async () => {
      const request: PricingRequest = {
        analysis_id: params.analysis_id,
        maker_id: params.maker_id,
        material_type: params.material_type,
        quantity: params.quantity || 1,
        rush_order: params.rush_order || false,
      };

      const response = await apiClient.post<PricingBreakdown>(
        "/api/pricing/calculate",
        request
      );
      return response.data;
    },
    enabled: !!(params.analysis_id && params.maker_id && params.material_type),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error: any) => {
      // Only show error toast if it's not a background refetch
      if (!queryClient.isFetching(queryKeys.pricing.calculate(params))) {
        const message =
          error.response?.data?.message || "Failed to load pricing";
        toast.error("Pricing Error", {
          description: message,
        });
      }
    },
  });
}
