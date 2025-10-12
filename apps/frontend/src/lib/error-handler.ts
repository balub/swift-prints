/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */
import { AxiosError } from "axios";
import { toast } from "sonner";

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  recoverable: boolean;
  originalError?: any;
}

export class ErrorHandler {
  /**
   * Transform API errors into user-friendly messages
   */
  static handleApiError(error: AxiosError): UserFriendlyError {
    // Network errors
    if (!error.response) {
      return {
        title: "Network Error",
        message: "Please check your internet connection and try again.",
        action: "retry",
        recoverable: true,
        originalError: error,
      };
    }

    const status = error.response.status;
    const data = error.response.data as any;

    switch (status) {
      case 400:
        return {
          title: "Invalid Request",
          message: data?.message || "Please check your input and try again.",
          recoverable: true,
          originalError: error,
        };

      case 401:
        return {
          title: "Authentication Required",
          message: "Please sign in to continue.",
          action: "redirect_to_login",
          recoverable: true,
          originalError: error,
        };

      case 403:
        return {
          title: "Access Denied",
          message: "You don't have permission to perform this action.",
          recoverable: false,
          originalError: error,
        };

      case 404:
        return {
          title: "Not Found",
          message: "The requested resource was not found.",
          recoverable: false,
          originalError: error,
        };

      case 409:
        return {
          title: "Conflict",
          message: data?.message || "This action conflicts with existing data.",
          recoverable: true,
          originalError: error,
        };

      case 422:
        const validationErrors = data?.errors || [];
        return {
          title: "Validation Error",
          message:
            validationErrors.length > 0
              ? validationErrors.map((e: any) => e.message).join(", ")
              : "Please check your input and try again.",
          recoverable: true,
          originalError: error,
        };

      case 429:
        return {
          title: "Too Many Requests",
          message: "Please wait a moment before trying again.",
          action: "retry_later",
          recoverable: true,
          originalError: error,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: "Server Error",
          message: "Something went wrong on our end. Please try again.",
          action: "retry",
          recoverable: true,
          originalError: error,
        };

      default:
        return {
          title: "Request Failed",
          message:
            data?.message || error.message || "An unexpected error occurred.",
          recoverable: true,
          originalError: error,
        };
    }
  }

  /**
   * Handle file upload errors
   */
  static handleUploadError(error: any): UserFriendlyError {
    if (error.name === "FileTooLargeError") {
      return {
        title: "File Too Large",
        message: "Please select a file smaller than 50MB.",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.name === "InvalidFileTypeError") {
      return {
        title: "Invalid File Type",
        message: "Only STL files are supported.",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.name === "NetworkError") {
      return {
        title: "Upload Failed",
        message: "Please check your connection and try again.",
        action: "retry",
        recoverable: true,
        originalError: error,
      };
    }

    return {
      title: "Upload Failed",
      message: error.message || "Failed to upload file. Please try again.",
      action: "retry",
      recoverable: true,
      originalError: error,
    };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any): UserFriendlyError {
    if (error.message?.includes("Invalid login credentials")) {
      return {
        title: "Invalid Credentials",
        message: "Please check your email and password.",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.message?.includes("Email not confirmed")) {
      return {
        title: "Email Not Verified",
        message: "Please check your email and click the verification link.",
        action: "resend_verification",
        recoverable: true,
        originalError: error,
      };
    }

    if (error.message?.includes("Too many requests")) {
      return {
        title: "Too Many Attempts",
        message: "Please wait a few minutes before trying again.",
        recoverable: true,
        originalError: error,
      };
    }

    return {
      title: "Authentication Failed",
      message: error.message || "Please try signing in again.",
      recoverable: true,
      originalError: error,
    };
  }

  /**
   * Show error toast notification
   */
  static showErrorToast(error: UserFriendlyError) {
    toast.error(error.title, {
      description: error.message,
      action:
        error.recoverable && error.action === "retry"
          ? {
              label: "Retry",
              onClick: () => window.location.reload(),
            }
          : undefined,
    });
  }

  /**
   * Show success toast notification
   */
  static showSuccessToast(title: string, message?: string) {
    toast.success(title, {
      description: message,
    });
  }

  /**
   * Show info toast notification
   */
  static showInfoToast(title: string, message?: string) {
    toast.info(title, {
      description: message,
    });
  }

  /**
   * Show warning toast notification
   */
  static showWarningToast(title: string, message?: string) {
    toast.warning(title, {
      description: message,
    });
  }

  /**
   * Log error for debugging and monitoring
   */
  static logError(error: any, context?: string) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.error("Error logged:", errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, {
      //   tags: { context },
      //   extra: errorInfo
      // });
    }
  }

  /**
   * Handle global unhandled errors
   */
  static setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);

      this.logError(event.reason, "unhandled_promise_rejection");

      // Prevent the default browser error handling
      event.preventDefault();

      // Show user-friendly error
      this.showErrorToast({
        title: "Something went wrong",
        message:
          "An unexpected error occurred. Please try refreshing the page.",
        recoverable: true,
      });
    });

    // Handle global JavaScript errors
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);

      this.logError(event.error, "global_error");

      // Don't show toast for every error as ErrorBoundary will handle React errors
    });

    // Handle authentication errors globally
    window.addEventListener("auth-error", ((event: CustomEvent) => {
      const authError = this.handleAuthError(event.detail.error);
      this.showErrorToast(authError);

      // Redirect to login if needed
      if (authError.action === "redirect_to_login") {
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    }) as EventListener);
  }
}

// Initialize global error handling
ErrorHandler.setupGlobalErrorHandling();

export default ErrorHandler;
