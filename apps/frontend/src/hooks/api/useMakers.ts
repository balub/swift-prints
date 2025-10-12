/**
 * Maker API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  MakerPublicResponse,
  MakerResponse,
  MakerSearchFilters,
  MakerCreate,
  MakerUpdate,
  CapacityInfo,
  MakerStats,
  PrinterCreate,
  PrinterUpdate,
  PrinterResponse,
  MaterialCreate,
  MaterialUpdate,
  MaterialResponse,
} from "@/types/api";
import { toast } from "sonner";

// Maker queries
export function useMakers(filters: MakerSearchFilters = {}) {
  return useQuery({
    queryKey: queryKeys.makers.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<MakerPublicResponse[]>(
        "/api/makers/search",
        {
          params: filters,
        }
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMaker(makerId: string) {
  return useQuery({
    queryKey: queryKeys.makers.detail(makerId),
    queryFn: async () => {
      const response = await apiClient.get<MakerPublicResponse>(
        `/api/makers/${makerId}`
      );
      return response.data;
    },
    enabled: !!makerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyMakerProfile() {
  return useQuery({
    queryKey: queryKeys.makers.me(),
    queryFn: async () => {
      const response = await apiClient.get<MakerResponse>("/api/makers/me");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (no maker profile)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useMakerCapacity(makerId: string) {
  return useQuery({
    queryKey: queryKeys.makers.capacity(makerId),
    queryFn: async () => {
      const response = await apiClient.get<CapacityInfo>(
        `/api/makers/${makerId}/capacity`
      );
      return response.data;
    },
    enabled: !!makerId,
    staleTime: 1 * 60 * 1000, // 1 minute (capacity changes frequently)
  });
}

export function useMakerStats(makerId: string) {
  return useQuery({
    queryKey: queryKeys.makers.stats(makerId),
    queryFn: async () => {
      const response = await apiClient.get<MakerStats>(
        `/api/makers/${makerId}/stats`
      );
      return response.data;
    },
    enabled: !!makerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Maker mutations
export function useCreateMakerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MakerCreate) => {
      const response = await apiClient.post<MakerResponse>("/api/makers", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Update cache with new maker profile
      queryClient.setQueryData(queryKeys.makers.me(), data);

      // Invalidate makers list to include new maker
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.lists() });

      toast.success("Maker profile created successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to create maker profile", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdateMakerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      makerId,
      data,
    }: {
      makerId: string;
      data: MakerUpdate;
    }) => {
      const response = await apiClient.put<MakerResponse>(
        `/api/makers/${makerId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(queryKeys.makers.me(), data);
      queryClient.setQueryData(
        queryKeys.makers.detail(variables.makerId),
        data
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.lists() });

      toast.success("Profile updated successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to update profile", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdateMakerAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      makerId,
      available,
    }: {
      makerId: string;
      available: boolean;
    }) => {
      const response = await apiClient.put(
        `/api/makers/${makerId}/availability`,
        { available }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(
        queryKeys.makers.me(),
        (old: MakerResponse | undefined) => {
          if (old) {
            return { ...old, available: variables.available };
          }
          return old;
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.makers.capacity(variables.makerId),
      });

      toast.success(
        `Availability ${variables.available ? "enabled" : "disabled"}`
      );
    },
    onError: (error: any) => {
      toast.error("Failed to update availability", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

// Printer mutations
export function useAddPrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      makerId,
      data,
    }: {
      makerId: string;
      data: PrinterCreate;
    }) => {
      const response = await apiClient.post<PrinterResponse>(
        `/api/makers/${makerId}/printers`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate maker profile to refetch with new printer
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.makers.detail(variables.makerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.printers.byMaker(variables.makerId),
      });

      toast.success("Printer added successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to add printer", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      printerId,
      data,
    }: {
      printerId: string;
      data: PrinterUpdate;
    }) => {
      const response = await apiClient.put<PrinterResponse>(
        `/api/makers/printers/${printerId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.printers.detail(data.id),
      });

      toast.success("Printer updated successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to update printer", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useDeletePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (printerId: string) => {
      await apiClient.delete(`/api/makers/printers/${printerId}`);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.printers.all });

      toast.success("Printer deleted successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete printer", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

// Material mutations
export function useAddMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      printerId,
      data,
    }: {
      printerId: string;
      data: MaterialCreate;
    }) => {
      const response = await apiClient.post<MaterialResponse>(
        `/api/makers/printers/${printerId}/materials`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.byPrinter(variables.printerId),
      });

      toast.success("Material added successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to add material", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      materialId,
      data,
    }: {
      materialId: string;
      data: MaterialUpdate;
    }) => {
      const response = await apiClient.put<MaterialResponse>(
        `/api/makers/materials/${materialId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.materials.detail(data.id),
      });

      toast.success("Material updated successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to update material", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialId: string) => {
      await apiClient.delete(`/api/makers/materials/${materialId}`);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.makers.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });

      toast.success("Material deleted successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete material", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}
