/**
 * Core API client for Swift Prints frontend
 * Handles authentication, error handling, and request/response transformation
 */
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from "axios";

// Types for API responses and errors
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  recoverable: boolean;
  originalError?: any;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  retryCount?: number;
  timeout?: number;
}

// Configuration interface
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      this.axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common["Authorization"];
    }
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add request ID for tracking
        config.headers["X-Request-ID"] = this.generateRequestId();

        // Add timestamp
        config.metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Calculate request duration
        const duration =
          Date.now() - (response.config.metadata?.startTime || 0);

        // Log successful requests in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ ${response.config.method?.toUpperCase()} ${
              response.config.url
            } - ${duration}ms`
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || 0);

        // Log failed requests in development
        if (process.env.NODE_ENV === "development") {
          console.error(
            `❌ ${error.config?.method?.toUpperCase()} ${
              error.config?.url
            } - ${duration}ms`,
            error.response?.status
          );
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          await this.handleAuthError(error);
        }

        // Retry logic for retryable errors
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const status = error.response?.status;
    const retryCount = error.config?.retryCount || 0;

    return (
      status !== undefined &&
      retryableStatuses.includes(status) &&
      retryCount < (this.config.retryAttempts || 3)
    );
  }

  /**
   * Retry failed request with exponential backoff
   */
  private async retryRequest(error: AxiosError): Promise<any> {
    const config = error.config!;
    const retryCount = (config.retryCount || 0) + 1;
    const delay = this.calculateRetryDelay(retryCount);

    config.retryCount = retryCount;

    console.log(`🔄 Retrying request (attempt ${retryCount}) after ${delay}ms`);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return this.axiosInstance.request(config);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(error: AxiosError): Promise<void> {
    // Clear invalid token
    this.setAuthToken(null);

    // Emit auth error event for global handling
    window.dispatchEvent(
      new CustomEvent("auth-error", {
        detail: { error, message: "Authentication failed" },
      })
    );
  }

  /**
   * Transform axios error to user-friendly error
   */
  private transformError(error: AxiosError): UserFriendlyError {
    if (error.response?.status === 401) {
      return {
        title: "Authentication Required",
        message: "Please log in to continue",
        action: "redirect_to_login",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.response?.status === 403) {
      return {
        title: "Access Denied",
        message: "You don't have permission to perform this action",
        recoverable: false,
        originalError: error,
      };
    }

    if (error.response?.status === 404) {
      return {
        title: "Not Found",
        message: "The requested resource was not found",
        recoverable: false,
        originalError: error,
      };
    }

    if (error.response?.status === 422) {
      const validationErrors = error.response.data?.errors || [];
      return {
        title: "Validation Error",
        message:
          validationErrors.length > 0
            ? validationErrors.map((e: ValidationError) => e.message).join(", ")
            : "Please check your input and try again",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.response?.status && error.response.status >= 500) {
      return {
        title: "Server Error",
        message: "Something went wrong on our end. Please try again.",
        action: "retry",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.code === "NETWORK_ERROR" || !error.response) {
      return {
        title: "Network Error",
        message: "Please check your internet connection and try again.",
        action: "retry",
        recoverable: true,
        originalError: error,
      };
    }

    return {
      title: "Request Failed",
      message:
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred",
      recoverable: true,
      originalError: error,
    };
  }

  /**
   * Generic GET request
   */
  async get<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }

  /**
   * File upload with progress tracking
   */
  async uploadFile(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.axiosInstance.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    return {
      data: response.data,
      status: response.status,
      message: response.statusText,
    };
  }
}

// Create and export default API client instance
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

export default apiClient;
export { ApiClient };
