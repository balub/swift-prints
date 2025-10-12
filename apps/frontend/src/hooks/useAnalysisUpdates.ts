/**
 * Analysis Updates Hook
 * Provides real-time file analysis progress updates via WebSocket
 */
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./useWebSocket";
import { AnalysisUpdateMessage, AnalysisResultResponse } from "@/types/api";
import { toast } from "sonner";

export interface UseAnalysisUpdatesOptions {
  jobId?: string;
  onProgressUpdate?: (progress: number, jobId: string) => void;
  onAnalysisComplete?: (result: AnalysisResultResponse, jobId: string) => void;
  onAnalysisError?: (error: string, jobId: string) => void;
  enableNotifications?: boolean;
}

export function useAnalysisUpdates(options: UseAnalysisUpdatesOptions = {}) {
  const {
    jobId,
    onProgressUpdate,
    onAnalysisComplete,
    onAnalysisError,
    enableNotifications = true,
  } = options;
  const queryClient = useQueryClient();
  const subscribedJobsRef = useRef<Set<string>>(new Set());

  const handleMessage = useCallback(
    (data: any) => {
      if (data.type === "analysis_update") {
        const { analysis_id, status, progress, result } = data;

        // Update analysis status cache
        queryClient.setQueryData(["files", "analysis-status", analysis_id], {
          job_id: analysis_id,
          status,
          progress,
          result,
        });

        // Handle different status updates
        switch (status) {
          case "processing":
            if (progress !== undefined) {
              onProgressUpdate?.(progress, analysis_id);

              if (enableNotifications && progress % 25 === 0) {
                toast.info(`Analysis Progress`, {
                  description: `File analysis ${progress}% complete`,
                });
              }
            }
            break;

          case "completed":
            if (result) {
              // Update analysis result cache
              queryClient.setQueryData(
                ["files", "analysis-result", result.id],
                result
              );

              // Invalidate related queries
              queryClient.invalidateQueries({
                queryKey: ["files", "analysis"],
              });

              onAnalysisComplete?.(result, analysis_id);

              if (enableNotifications) {
                toast.success("Analysis Complete", {
                  description: "Your file has been analyzed successfully",
                });
              }
            }
            break;

          case "failed":
            const error = data.error || "Analysis failed";
            onAnalysisError?.(error, analysis_id);

            if (enableNotifications) {
              toast.error("Analysis Failed", {
                description: error,
              });
            }
            break;

          case "pending":
            if (enableNotifications) {
              toast.info("Analysis Queued", {
                description: "Your file is queued for analysis",
              });
            }
            break;
        }
      }
    },
    [
      queryClient,
      onProgressUpdate,
      onAnalysisComplete,
      onAnalysisError,
      enableNotifications,
    ]
  );

  const { connected, error, sendMessage } = useWebSocket({
    url: "/api/ws/connect",
    onMessage: handleMessage,
    onConnect: () => {
      // Re-subscribe to all previously subscribed analysis jobs
      subscribedJobsRef.current.forEach((jobIdToSubscribe) => {
        sendMessage({
          type: "subscribe",
          channel: `analysis:${jobIdToSubscribe}`,
        });
      });
    },
  });

  // Subscribe to specific job when jobId changes
  useEffect(() => {
    if (connected && jobId) {
      subscribedJobsRef.current.add(jobId);
      sendMessage({
        type: "subscribe",
        channel: `analysis:${jobId}`,
      });
    }
  }, [connected, jobId, sendMessage]);

  const subscribeToAnalysis = useCallback(
    (jobIdToSubscribe: string) => {
      if (connected) {
        subscribedJobsRef.current.add(jobIdToSubscribe);
        sendMessage({
          type: "subscribe",
          channel: `analysis:${jobIdToSubscribe}`,
        });
      }
    },
    [connected, sendMessage]
  );

  const unsubscribeFromAnalysis = useCallback(
    (jobIdToUnsubscribe: string) => {
      if (connected) {
        subscribedJobsRef.current.delete(jobIdToUnsubscribe);
        sendMessage({
          type: "unsubscribe",
          channel: `analysis:${jobIdToUnsubscribe}`,
        });
      }
    },
    [connected, sendMessage]
  );

  const requestAnalysisStatus = useCallback(
    (jobIdToCheck: string) => {
      if (connected) {
        sendMessage({
          type: "get_status",
          analysis_id: jobIdToCheck,
        });
      }
    },
    [connected, sendMessage]
  );

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscribedJobsRef.current.clear();
    };
  }, []);

  return {
    connected,
    error,
    subscribeToAnalysis,
    unsubscribeFromAnalysis,
    requestAnalysisStatus,
  };
}

export default useAnalysisUpdates;
