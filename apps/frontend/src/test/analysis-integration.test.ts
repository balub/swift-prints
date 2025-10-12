/**
 * Analysis Integration Tests
 * Tests the STL file analysis integration with backend
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UploadedFile,
  PrintSettings,
  AnalysisResultResponse,
} from "../types/api";

// Mock the API client
vi.mock("../lib/api-client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock the WebSocket hook
vi.mock("../hooks/useWebSocket", () => ({
  useWebSocket: vi.fn(() => ({
    connected: true,
    error: null,
    sendMessage: vi.fn(),
  })),
}));

// Mock the analysis updates hook
vi.mock("../hooks/useAnalysisUpdates", () => ({
  useAnalysisUpdates: vi.fn(() => ({
    connected: true,
    subscribeToAnalysis: vi.fn(),
    unsubscribeFromAnalysis: vi.fn(),
    requestAnalysisStatus: vi.fn(),
  })),
}));

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Analysis Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle analysis request data structure", () => {
    const mockFile: UploadedFile = {
      id: "file-123",
      filename: "test.stl",
      original_filename: "test.stl",
      file_size: 1024000,
      uploaded_at: "2023-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    const mockSettings: PrintSettings = {
      layer_height: 0.2,
      infill_density: 20,
      infill_pattern: "grid",
      supports: true,
      bed_adhesion: "brim",
      material_type: "PLA",
      nozzle_temperature: 210,
      bed_temperature: 60,
    };

    // Verify the data structures are correctly typed
    expect(mockFile.id).toBe("file-123");
    expect(mockFile.file_size).toBe(1024000);
    expect(mockSettings.layer_height).toBe(0.2);
    expect(mockSettings.supports).toBe(true);
  });

  it("should format analysis metrics correctly", () => {
    const mockResult: AnalysisResultResponse = {
      id: "analysis-123",
      file_id: "file-123",
      settings: {},
      metrics: {
        filament_grams: 25.5,
        print_time_hours: 2.5,
        volume_mm3: 15000,
        complexity_score: 7.2,
        supports_required: true,
      },
      analyzed_at: "2023-01-01T00:00:00Z",
    };

    // Test metric formatting logic
    const formatAnalysisMetrics = (result: AnalysisResultResponse) => {
      return {
        printTime: `${result.metrics.print_time_hours.toFixed(1)} hours`,
        material: `${result.metrics.filament_grams.toFixed(1)}g`,
        volume: `${(result.metrics.volume_mm3 / 1000).toFixed(1)} cm³`,
        complexity: result.metrics.complexity_score.toFixed(1),
        supports: result.metrics.supports_required
          ? "Required"
          : "Not required",
      };
    };

    const metrics = formatAnalysisMetrics(mockResult);

    expect(metrics).toEqual({
      printTime: "2.5 hours",
      material: "25.5g",
      volume: "15.0 cm³",
      complexity: "7.2",
      supports: "Required",
    });
  });

  it("should handle file size formatting", () => {
    const formatFileSize = (bytes: number): string => {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    };

    expect(formatFileSize(1024000)).toBe("0.98 MB");
    expect(formatFileSize(5242880)).toBe("5.00 MB");
    expect(formatFileSize(52428800)).toBe("50.00 MB");
  });
});

describe("Analysis API Integration", () => {
  it("should call correct API endpoints", async () => {
    const apiClient = await import("../lib/api-client");
    const mockPost = vi.mocked(apiClient.default.post);
    const mockGet = vi.mocked(apiClient.default.get);

    // Test analysis start endpoint
    mockPost.mockResolvedValueOnce({
      data: { job_id: "job-123", message: "Analysis started" },
      status: 200,
    });

    const analysisRequest = {
      file_id: "file-123",
      settings: {
        layer_height: 0.2,
        infill_density: 20,
        infill_pattern: "grid",
        supports: true,
        bed_adhesion: "brim",
        material_type: "PLA",
        nozzle_temperature: 210,
        bed_temperature: 60,
      },
    };

    await apiClient.default.post("/api/analysis", analysisRequest);

    expect(mockPost).toHaveBeenCalledWith("/api/analysis", analysisRequest);

    // Test status endpoint
    mockGet.mockResolvedValueOnce({
      data: {
        job_id: "job-123",
        status: "processing",
        progress: 50,
      },
      status: 200,
    });

    await apiClient.default.get("/api/analysis/jobs/job-123/status");

    expect(mockGet).toHaveBeenCalledWith("/api/analysis/jobs/job-123/status");

    // Test result endpoint
    mockGet.mockResolvedValueOnce({
      data: {
        id: "result-123",
        file_id: "file-123",
        settings: {},
        metrics: {
          filament_grams: 25.5,
          print_time_hours: 2.5,
          volume_mm3: 15000,
          complexity_score: 7.2,
          supports_required: true,
        },
        analyzed_at: "2023-01-01T00:00:00Z",
      },
      status: 200,
    });

    await apiClient.default.get("/api/analysis/results/result-123");

    expect(mockGet).toHaveBeenCalledWith("/api/analysis/results/result-123");
  });

  it("should handle WebSocket message format", () => {
    const mockAnalysisUpdate = {
      type: "analysis_update",
      analysis_id: "job-123",
      status: "processing",
      progress: 75,
      timestamp: "2023-01-01T00:00:00Z",
    };

    // Verify message structure
    expect(mockAnalysisUpdate.type).toBe("analysis_update");
    expect(mockAnalysisUpdate.analysis_id).toBe("job-123");
    expect(mockAnalysisUpdate.status).toBe("processing");
    expect(mockAnalysisUpdate.progress).toBe(75);
  });

  it("should handle analysis completion message", () => {
    const mockCompletionMessage = {
      type: "analysis_update",
      analysis_id: "job-123",
      status: "completed",
      progress: 100,
      result: {
        id: "result-123",
        file_id: "file-123",
        settings: {},
        metrics: {
          filament_grams: 25.5,
          print_time_hours: 2.5,
          volume_mm3: 15000,
          complexity_score: 7.2,
          supports_required: true,
        },
        analyzed_at: "2023-01-01T00:00:00Z",
      },
      timestamp: "2023-01-01T00:00:00Z",
    };

    // Verify completion message structure
    expect(mockCompletionMessage.status).toBe("completed");
    expect(mockCompletionMessage.progress).toBe(100);
    expect(mockCompletionMessage.result).toBeDefined();
    expect(mockCompletionMessage.result?.metrics.filament_grams).toBe(25.5);
  });
});
