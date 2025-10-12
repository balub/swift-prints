/**
 * Error Fallback Component
 * Reusable error display component
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error;
  title?: string;
  message?: string;
  showRetry?: boolean;
  showGoHome?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  showRetry = true,
  showGoHome = false,
  onRetry,
  onGoHome,
  className = "",
}: ErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">{message}</p>

          {process.env.NODE_ENV === "development" && error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs font-mono">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col space-y-2">
            {showRetry && (
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}

            {showGoHome && (
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorFallback;
