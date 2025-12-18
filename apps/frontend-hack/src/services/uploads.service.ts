// Uploads Service - File upload and analysis operations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiFormRequest,
  apiRequest,
  queryKeys,
  type UploadResponse,
} from "./api-client";

// ============ API Functions ============

export async function analyzeUpload(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFormRequest<UploadResponse>("/uploads/analyze", formData);
}

export async function getUpload(uploadId: string): Promise<UploadResponse> {
  return apiRequest<UploadResponse>(`/uploads/${uploadId}`);
}

export async function getDownloadUrl(
  uploadId: string
): Promise<{ url: string }> {
  const response = await apiRequest<{ downloadUrl: string }>(`/uploads/${uploadId}/download`);
  return { url: response.downloadUrl };
}

// ============ React Query Hooks ============

/**
 * Hook to get upload details by ID
 */
export function useUpload(uploadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.uploads.detail(uploadId!),
    queryFn: () => getUpload(uploadId!),
    enabled: !!uploadId,
  });
}

/**
 * Hook to get download URL for an upload
 */
export function useUploadDownloadUrl(uploadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.uploads.download(uploadId!),
    queryFn: async () => {
      const result = await getDownloadUrl(uploadId!);
      return result.url;
    },
    enabled: !!uploadId,
  });
}

/**
 * Hook to analyze/upload a file
 */
export function useAnalyzeUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: analyzeUpload,
    onSuccess: (data) => {
      // Cache the upload data
      queryClient.setQueryData(queryKeys.uploads.detail(data.uploadId), data);
    },
  });
}

