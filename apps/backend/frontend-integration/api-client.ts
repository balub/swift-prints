// Generated API Client for Swift Prints
// Base URL: http://localhost:8000

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    request_id: string;
    timestamp: string;
  };
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

export class SwiftPrintsApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private defaultTimeout = 30000;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config?.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(config?.timeout || this.defaultTimeout),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          error: responseData.error || {
            code: "HTTP_ERROR",
            message: "Request failed",
          },
        };
      }

      return { data: responseData };
    } catch (error) {
      return {
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          request_id: "",
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Authentication methods
  async verifyToken(token: string): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/auth/verify", { token });
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/auth/me");
  }

  async refreshToken(): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/auth/refresh");
  }

  // File upload methods
  async initiateUpload(
    filename: string,
    size: number
  ): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/upload/initiate", { filename, size });
  }

  async completeUpload(sessionId: string): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/upload/complete", {
      session_id: sessionId,
    });
  }

  // File management methods
  async getFiles(): Promise<ApiResponse<any[]>> {
    return this.request("GET", "/api/files");
  }

  async getFile(fileId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/files/${fileId}`);
  }

  async deleteFile(fileId: string): Promise<ApiResponse<any>> {
    return this.request("DELETE", `/api/files/${fileId}`);
  }

  // Analysis methods
  async analyzeFile(fileId: string, settings?: any): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/analyze", { file_id: fileId, settings });
  }

  async getAnalysisStatus(jobId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/analyze/${jobId}`);
  }

  async getAnalysisResult(jobId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/analyze/${jobId}/result`);
  }

  // Maker methods
  async createMakerProfile(data: any): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/makers", data);
  }

  async searchMakers(params?: any): Promise<ApiResponse<any[]>> {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return this.request("GET", `/api/makers/search${queryString}`);
  }

  async getMyMakerProfile(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/makers/me");
  }

  async getMaker(makerId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/makers/${makerId}`);
  }

  async updateMakerProfile(
    makerId: string,
    data: any
  ): Promise<ApiResponse<any>> {
    return this.request("PUT", `/api/makers/${makerId}`, data);
  }

  async getMakerCapacity(makerId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/makers/${makerId}/capacity`);
  }

  // Pricing methods
  async calculatePricing(data: any): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/pricing/calculate", data);
  }

  async getMarketRates(
    materialType: string,
    lat: number,
    lng: number
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      material_type: materialType,
      location_lat: lat.toString(),
      location_lng: lng.toString(),
    });
    return this.request("GET", `/api/pricing/rates?${params}`);
  }

  async comparePrices(data: any): Promise<ApiResponse<any[]>> {
    return this.request("POST", "/api/pricing/compare", data);
  }

  async generateQuote(data: any): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/pricing/quote", data);
  }

  async createPricingSession(analysisId: string): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/pricing/session", {
      analysis_id: analysisId,
    });
  }

  // Order methods
  async createOrder(data: any): Promise<ApiResponse<any>> {
    return this.request("POST", "/api/orders", data);
  }

  async getOrders(params?: any): Promise<ApiResponse<any[]>> {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return this.request("GET", `/api/orders${queryString}`);
  }

  async getOrder(orderId: string): Promise<ApiResponse<any>> {
    return this.request("GET", `/api/orders/${orderId}`);
  }

  async updateOrderStatus(
    orderId: string,
    data: any
  ): Promise<ApiResponse<any>> {
    return this.request("PUT", `/api/orders/${orderId}/status`, data);
  }

  async cancelOrder(orderId: string, data: any): Promise<ApiResponse<any>> {
    return this.request("POST", `/api/orders/${orderId}/cancel`, data);
  }

  async rateOrder(orderId: string, data: any): Promise<ApiResponse<any>> {
    return this.request("POST", `/api/orders/${orderId}/rate`, data);
  }

  async getOrderStats(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/orders/stats");
  }

  // System methods
  async getHealth(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/system/health");
  }

  async getSystemInfo(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/system/info");
  }

  async getSystemConfig(): Promise<ApiResponse<any>> {
    return this.request("GET", "/api/system/config");
  }

  // WebSocket connection
  connectWebSocket(token: string): WebSocket {
    const wsUrl =
      this.baseUrl.replace("http", "ws") + `/api/ws/connect?token=${token}`;
    return new WebSocket(wsUrl);
  }
}

// Default client instance
export const apiClient = new SwiftPrintsApiClient();

// React hooks for API integration
export const useApiClient = () => {
  return apiClient;
};

// Error handling utilities
export const isApiError = (
  response: ApiResponse
): response is { error: any } => {
  return "error" in response && response.error !== undefined;
};

export const getErrorMessage = (response: ApiResponse): string => {
  if (isApiError(response)) {
    return response.error.message || "An error occurred";
  }
  return "";
};
