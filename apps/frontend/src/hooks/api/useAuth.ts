/**
 * Authentication API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { User } from "@/types/api";
import { toast } from "sonner";

export function useVerifyToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post("/auth/verify", { token });
      return response.data;
    },
    onError: (error: any) => {
      console.error("Token verification failed:", error);
      toast.error("Authentication failed", {
        description: "Please sign in again",
      });
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await apiClient.get<User>("/auth/me");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/auth/refresh");
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user queries to refetch with new token
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
    onError: (error: any) => {
      console.error("Token refresh failed:", error);
      // Clear auth state on refresh failure
      queryClient.setQueryData(queryKeys.auth.user(), null);
    },
  });
}
