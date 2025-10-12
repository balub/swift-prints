/**
 * Pricing Error Fallback Component
 * Handles pricing calculation errors with fallback scenarios
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useMarketRates, usePricingConfig } from "@/hooks/api/usePricing";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  AlertTriangle,
  RefreshCw,
  Calculator,
  TrendingUp,
  Info,
  Clock,
  DollarSign,
  Wifi,
  WifiOff,
} from "lucide-react";

interface PricingErrorFallbackProps {
  error: Error | null;
  materialType?: string;
  quantity?: number;
  estimatedWeight?: number; // in grams
  estimatedPrintTime?: number; // in hours
  userLocation?: {
    lat: number;
    lng: number;
  };
  onRetry?: () => void;
  onFallbackAccept?: (estimatedPrice: number) => void;
}

export function PricingErrorFallback({
  error,
  materialType = "PLA",
  quantity = 1,
  estimatedWeight = 0,
  estimatedPrintTime = 0,
  userLocation,
  onRetry,
  onFallbackAccept,
}: PricingErrorFallbackProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Try to get market rates for fallback calculation
  const {
    data: marketRates,
    isLoading: ratesLoading,
    error: ratesError,
  } = useMarketRates(materialType, userLocation?.lat, userLocation?.lng);

  // Get pricing configuration for fallback
  const { data: pricingConfig, isLoading: configLoading } = usePricingConfig();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  };

  const calculateFallbackPricing = () => {
    if (
      !marketRates ||
      !pricingConfig ||
      !estimatedWeight ||
      !estimatedPrintTime
    ) {
      return null;
    }

    // Basic fallback calculation
    const materialCost =
      estimatedWeight * marketRates.avg_price_per_gram * quantity;
    const laborCost =
      estimatedPrintTime * pricingConfig.base_labor_rate * quantity;
    const platformFee =
      (materialCost + laborCost) * pricingConfig.platform_fee_percentage;
    const subtotal = materialCost + laborCost;
    const total = subtotal + platformFee;

    return {
      material_cost: materialCost,
      labor_cost: laborCost,
      platform_fee: platformFee,
      subtotal,
      total,
      per_unit_cost: total / quantity,
      estimated_delivery_days: 5, // Default estimate
      currency: "USD",
    };
  };

  const fallbackPricing = calculateFallbackPricing();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getErrorType = () => {
    if (!error) return "unknown";

    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("connection")) {
      return "network";
    }
    if (message.includes("timeout")) {
      return "timeout";
    }
    if (message.includes("not found") || message.includes("404")) {
      return "not_found";
    }
    if (message.includes("unauthorized") || message.includes("401")) {
      return "auth";
    }
    if (message.includes("server") || message.includes("500")) {
      return "server";
    }

    return "unknown";
  };

  const getErrorMessage = () => {
    const errorType = getErrorType();

    switch (errorType) {
      case "network":
        return {
          title: "Network Connection Error",
          description:
            "Unable to connect to pricing service. Please check your internet connection.",
          icon: WifiOff,
          canRetry: true,
        };
      case "timeout":
        return {
          title: "Request Timeout",
          description:
            "The pricing calculation is taking longer than expected. Please try again.",
          icon: Clock,
          canRetry: true,
        };
      case "not_found":
        return {
          title: "Resource Not Found",
          description:
            "The requested analysis or maker information could not be found.",
          icon: AlertTriangle,
          canRetry: false,
        };
      case "auth":
        return {
          title: "Authentication Required",
          description: "Please log in to calculate pricing for this item.",
          icon: AlertTriangle,
          canRetry: false,
        };
      case "server":
        return {
          title: "Server Error",
          description:
            "Our pricing service is temporarily unavailable. Please try again in a few minutes.",
          icon: AlertTriangle,
          canRetry: true,
        };
      default:
        return {
          title: "Pricing Error",
          description:
            error?.message ||
            "An unexpected error occurred while calculating pricing.",
          icon: AlertTriangle,
          canRetry: true,
        };
    }
  };

  const errorInfo = getErrorMessage();
  const ErrorIcon = errorInfo.icon;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ErrorIcon className="w-5 h-5" />
          {errorInfo.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Description */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorInfo.description}</AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {errorInfo.canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="outline"
            >
              {isRetrying ? (
                <LoadingSpinner className="w-4 h-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Try Again
            </Button>
          )}

          {fallbackPricing && (
            <Button
              onClick={() => setShowFallback(!showFallback)}
              variant="secondary"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Show Estimate
            </Button>
          )}
        </div>

        {/* Fallback Pricing Estimate */}
        {showFallback && fallbackPricing && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Estimated Pricing
              </h4>
              <Badge variant="outline" className="text-xs">
                <Info className="w-3 h-3 mr-1" />
                Approximate
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Material Cost ({materialType})
                </span>
                <span>{formatCurrency(fallbackPricing.material_cost)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor Cost</span>
                <span>{formatCurrency(fallbackPricing.labor_cost)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span>{formatCurrency(fallbackPricing.platform_fee)}</span>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Estimated Total</span>
                <span className="text-primary">
                  {formatCurrency(fallbackPricing.total)}
                </span>
              </div>

              {quantity > 1 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Per Unit</span>
                  <span>{formatCurrency(fallbackPricing.per_unit_cost)}</span>
                </div>
              )}
            </div>

            {/* Fallback Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This estimate is based on market rates and may not reflect
                actual maker pricing.
                {marketRates && (
                  <>
                    {" "}
                    Market rate:{" "}
                    {formatCurrency(marketRates.avg_price_per_gram)}/gram (
                    {marketRates.sample_size} samples)
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Accept Estimate Button */}
            {onFallbackAccept && (
              <Button
                onClick={() => onFallbackAccept(fallbackPricing.total)}
                className="w-full"
                variant="outline"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Use This Estimate
              </Button>
            )}
          </div>
        )}

        {/* Loading States */}
        {(ratesLoading || configLoading) && showFallback && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner className="w-5 h-5 mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading market data for estimate...
            </span>
          </div>
        )}

        {/* No Fallback Available */}
        {showFallback &&
          !fallbackPricing &&
          !ratesLoading &&
          !configLoading && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Unable to provide pricing estimate.
                {ratesError && " Market rate data is unavailable."}
                {!estimatedWeight && " File analysis data is required."}
              </AlertDescription>
            </Alert>
          )}

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {navigator.onLine ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PricingErrorFallback;
