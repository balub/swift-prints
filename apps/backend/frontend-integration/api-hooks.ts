// React hooks for Swift Prints API integration
import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiResponse, isApiError } from "./api-client";

// Generic API hook
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();

      if (isApiError(response)) {
        setError(response.error.message);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

// File upload hook
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Initiate upload
      const initResponse = await apiClient.initiateUpload(file.name, file.size);

      if (isApiError(initResponse)) {
        throw new Error(initResponse.error.message);
      }

      const { session_id, upload_url } = initResponse.data;

      // Upload file
      const uploadResponse = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      setProgress(100);

      // Complete upload
      const completeResponse = await apiClient.completeUpload(session_id);

      if (isApiError(completeResponse)) {
        throw new Error(completeResponse.error.message);
      }

      return completeResponse.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, progress, error };
}

// WebSocket hook
export function useWebSocket(token: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;

    const ws = apiClient.connectWebSocket(token);

    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const sendMessage = useCallback(
    (message: any) => {
      if (socket && connected) {
        socket.send(JSON.stringify(message));
      }
    },
    [socket, connected]
  );

  return { socket, connected, messages, sendMessage };
}

// Analysis progress hook
export function useAnalysisProgress(jobId: string | null) {
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await apiClient.getAnalysisStatus(jobId);

        if (isApiError(response)) {
          setError(response.error.message);
          return;
        }

        const { status: newStatus, progress: newProgress } = response.data;
        setStatus(newStatus);
        setProgress(newProgress || 0);

        if (newStatus === "completed") {
          const resultResponse = await apiClient.getAnalysisResult(jobId);
          if (!isApiError(resultResponse)) {
            setResult(resultResponse.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status check failed");
      }
    };

    const interval = setInterval(checkStatus, 2000);
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [jobId]);

  return { status, progress, result, error };
}

// Pricing session hook
export function usePricingSession(analysisId: string | null) {
  const [session, setSession] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    if (!analysisId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createPricingSession(analysisId);

      if (isApiError(response)) {
        setError(response.error.message);
      } else {
        setSession(response.data);
        setPricing(response.data.current_pricing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session creation failed");
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    createSession();
  }, [createSession]);

  return { session, pricing, loading, error, refetch: createSession };
}
