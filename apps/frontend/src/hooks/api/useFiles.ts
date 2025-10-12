/**
 * File and Upload API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadRequest,
  CompleteUploadResponse,
  UploadStatusResponse,
  AnalysisRequest,
  AnalysisJobResponse,
  AnalysisStatusResponse,
  AnalysisResultResponse,
  UploadedFile,
} from "@/types/api";
import { toast } from "sonner";

// Upload hooks
export function useInitiateUpload() {
  return useMutation({
    mutationFn: async (data: InitiateUploadRequest) => {
      const response = await apiClient.post<InitiateUploadResponse>(
        "/api/upload/initiate",
        data
      );
      return response.data;
    },
    onError: (error: any) => {
      toast.error("Failed to initiate upload", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useCompleteUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompleteUploadRequest) => {
      const response = await apiClient.post<CompleteUploadResponse>(
        "/api/upload/complete",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Cache the uploaded file
      queryClient.setQueryData(queryKeys.files.file(data.file_id), {
        id: data.file_id,
        filename: data.filename,
        original_filename: data.filename,
        file_size: data.file_size,
        uploaded_at: data.upload_completed_at,
      } as UploadedFile);

      toast.success("File uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to complete upload", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useUploadStatus(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.uploads.session(sessionId),
    queryFn: async () => {
      const response = await apiClient.get<UploadStatusResponse>(
        `/api/upload/status/${sessionId}`
      );
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: 1000, // Poll every second during upload
    staleTime: 0, // Always refetch
  });
}

export function useCancelUpload() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.delete(
        `/api/upload/cancel/${sessionId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Upload cancelled");
    },
    onError: (error: any) => {
      toast.error("Failed to cancel upload", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useDirectUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await apiClient.uploadFile("/api/upload/direct", file);
      return response.data;
    },
    onSuccess: (data) => {
      // Cache the uploaded file
      queryClient.setQueryData(queryKeys.files.file(data.file_id), {
        id: data.file_id,
        filename: data.filename,
        original_filename: data.filename,
        file_size: data.file_size,
        uploaded_at: data.upload_completed_at,
      } as UploadedFile);

      toast.success("File uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error("Upload failed", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

// Analysis hooks
export function useAnalyzeFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AnalysisRequest) => {
      const response = await apiClient.post<AnalysisJobResponse>(
        "/api/analysis",
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Cache the job ID for tracking
      queryClient.setQueryData(
        queryKeys.files.analysisJob(variables.file_id),
        data
      );

      toast.success("File analysis started", {
        description: "We'll notify you when it's complete",
      });
    },
    onError: (error: any) => {
      toast.error("Analysis failed", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useAnalysisStatus(jobId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.files.analysisStatus(jobId),
    queryFn: async () => {
      const response = await apiClient.get<AnalysisStatusResponse>(
        `/api/analysis/jobs/${jobId}/status`
      );
      return response.data;
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when analysis is complete or failed
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    onSuccess: (data) => {
      // Cache the result when analysis completes
      if (data.status === "completed" && data.result_id) {
        // Fetch the full result
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.analysisResult(data.result_id),
        });

        toast.success("File analysis completed!", {
          description: "Your print estimates are ready",
        });
      } else if (data.status === "failed") {
        toast.error("File analysis failed", {
          description: data.error || "Please try uploading again",
        });
      }
    },
  });
}

export function useAnalysisResult(resultId: string) {
  return useQuery({
    queryKey: queryKeys.files.analysisResult(resultId),
    queryFn: async () => {
      const response = await apiClient.get<AnalysisResultResponse>(
        `/api/analysis/results/${resultId}`
      );
      return response.data;
    },
    enabled: !!resultId,
    staleTime: 10 * 60 * 1000, // 10 minutes (analysis results don't change)
  });
}

export function useFileAnalysisResults(fileId: string) {
  return useQuery({
    queryKey: queryKeys.files.fileAnalysisResults(fileId),
    queryFn: async () => {
      const response = await apiClient.get<AnalysisResultResponse[]>(
        `/api/analysis/files/${fileId}/results`
      );
      return response.data;
    },
    enabled: !!fileId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
