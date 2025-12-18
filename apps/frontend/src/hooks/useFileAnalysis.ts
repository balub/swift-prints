/**
 * File Analysis Hook
 * Integrates STL file analysis with backend service including real-time updates
 */
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnalyzeFile,
  useAnalysisStatus,
  useAnalysisResult,
} from "./api/useFiles";
import { useAnalysisUpdates } from "./useAnalysisUpdates";
import {
  AnalysisRequest,
  AnalysisResultResponse,
  PrintSettings,
  UploadedFile,
} from "@/types/api";
import { toast } from "sonner";
import { formatDurationFromHours } from "@/lib/utils";

export interface UseFileAnalysisOptions {
  onAnalysisComplete?: (result: AnalysisResultResponse) => void;
  onAnalysisError?: (error: string) => void;
  enableRealTimeUpdates?: boolean;
  enableNotifications?: boolean;
}

export interface FileAnalysisState {
  analyzing: boolean;
  progress: number;
  status: "idle" | "pending" | "processing" | "completed" | "failed";
  jobId: string | null;
  resultId: string | null;
  result: AnalysisResultResponse | null;
  error: string | null;
}

export function useFileAnalysis(options: UseFileAnalysisOptions = {}) {
  const {
    onAnalysisComplete,
    onAnalysisError,
    enableRealTimeUpdates = true,
    enableNotifications = true,
  } = options;

  const queryClient = useQueryClient();
  const [state, setState] = useState<FileAnalysisState>({
    analyzing: false,
    progress: 0,
    status: "idle",
    jobId: null,
    resultId: null,
    result: null,
    error: null,
  });

  // API hooks
  const analyzeFileMutation = useAnalyzeFile();
  const { data: analysisStatus } = useAnalysisStatus(state.jobId || "");
  const { data: analysisResult } = useAnalysisResult(state.resultId || "");

  // Real-time updates
  const { connected: wsConnected } = useAnalysisUpdates({
    jobId: state.jobId || undefined,
    onProgressUpdate: (progress, jobId) => {
      setState((prev) => ({
        ...prev,
        progress,
        status: "processing",
      }));
    },
    onAnalysisComplete: (result, jobId) => {
      setState((prev) => ({
        ...prev,
        analyzing: false,
        progress: 100,
        status: "completed",
        result,
        error: null,
      }));
      onAnalysisComplete?.(result);
    },
    onAnalysisError: (error, jobId) => {
      setState((prev) => ({
        ...prev,
        analyzing: false,
        status: "failed",
        error,
      }));
      onAnalysisError?.(error);
    },
    enableNotifications,
  });

  // Update state based on polling results (fallback when WebSocket is not available)
  useEffect(() => {
    if (analysisStatus && !wsConnected) {
      setState((prev) => ({
        ...prev,
        status: analysisStatus.status as any,
        progress: analysisStatus.progress || prev.progress,
        error: analysisStatus.error || null,
      }));

      if (analysisStatus.status === "completed" && analysisStatus.result_id) {
        setState((prev) => ({
          ...prev,
          analyzing: false,
          resultId: analysisStatus.result_id!,
        }));
      } else if (analysisStatus.status === "failed") {
        setState((prev) => ({
          ...prev,
          analyzing: false,
        }));
      }
    }
  }, [analysisStatus, wsConnected]);

  // Update result when available
  useEffect(() => {
    if (analysisResult) {
      setState((prev) => ({
        ...prev,
        result: analysisResult,
      }));

      if (prev.status === "completed") {
        onAnalysisComplete?.(analysisResult);
      }
    }
  }, [analysisResult, onAnalysisComplete]);

  const analyzeFile = useCallback(
    async (file: UploadedFile, settings?: PrintSettings) => {
      try {
        setState((prev) => ({
          ...prev,
          analyzing: true,
          progress: 0,
          status: "pending",
          jobId: null,
          resultId: null,
          result: null,
          error: null,
        }));

        const analysisRequest: AnalysisRequest = {
          file_id: file.id,
          settings,
        };

        const response = await analyzeFileMutation.mutateAsync(analysisRequest);

        setState((prev) => ({
          ...prev,
          jobId: response.job_id,
          status: "pending",
        }));

        if (enableNotifications) {
          toast.success("Analysis Started", {
            description: "Your STL file is being analyzed",
          });
        }

        return response.job_id;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Analysis failed to start";

        setState((prev) => ({
          ...prev,
          analyzing: false,
          status: "failed",
          error: errorMessage,
        }));

        onAnalysisError?.(errorMessage);
        throw error;
      }
    },
    [analyzeFileMutation, onAnalysisError, enableNotifications]
  );

  const retryAnalysis = useCallback(() => {
    if (state.jobId) {
      // Reset state and trigger re-fetch
      setState((prev) => ({
        ...prev,
        analyzing: true,
        status: "pending",
        error: null,
      }));

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ["files", "analysis-status", state.jobId],
      });
    }
  }, [state.jobId, queryClient]);

  const reset = useCallback(() => {
    setState({
      analyzing: false,
      progress: 0,
      status: "idle",
      jobId: null,
      resultId: null,
      result: null,
      error: null,
    });
  }, []);

  const getAnalysisMetrics = useCallback(() => {
    if (!state.result) return null;

    return {
      printTime: formatDurationFromHours(
        state.result.metrics.print_time_hours
      ),
      material: `${state.result.metrics.filament_grams.toFixed(1)}g`,
      volume: `${(state.result.metrics.volume_mm3 / 1000).toFixed(1)} cm³`,
      complexity: state.result.metrics.complexity_score.toFixed(1),
      supports: state.result.metrics.supports_required
        ? "Required"
        : "Not required",
    };
  }, [state.result]);

  const isAnalysisComplete =
    state.status === "completed" && state.result !== null;
  const hasError = state.status === "failed" && state.error !== null;

  return {
    // State
    ...state,
    wsConnected,
    isAnalysisComplete,
    hasError,

    // Actions
    analyzeFile,
    retryAnalysis,
    reset,

    // Computed values
    getAnalysisMetrics,

    // Loading states
    isStartingAnalysis: analyzeFileMutation.isPending,
  };
}

export default useFileAnalysis;
