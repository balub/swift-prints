/**
 * Enhanced Pricing Calculator Component
 * Real-time pricing calculations with detailed breakdown and error handling
 */
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRealTime } from "@/contexts/RealTimeContext";
import {
  useCachedPricing,
  useCalculatePricing,
  usePricingConfig,
} from "@/hooks/api/usePricing";
import { PricingParams, PricingBreakdown, PricingRequest } from "@/types/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Calculator,
  Zap,
  DollarSign,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Info,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PricingCalculatorProps {
  analysisId: string;
  makerId: string;
  materialType: string;
  quantity?: number;
  rushOrder?: boolean;
  onPricingUpdate?: (pricing: PricingBreakdown) => void;
  showControls?: boolean;
  showBreakdown?: boolean;
  enableRealTime?: boolean;
}

export function PricingCalculator({
  analysisId,
  makerId,
  materialType: initialMaterialType,
  quantity: initialQuantity = 1,
  rushOrder: initialRushOrder = false,
  onPricingUpdate,
  showControls = true,
  showBreakdown = true,
  enableRealTime = true,
}: PricingCalculatorProps) {
  const [materialType, setMaterialType] = useState(initialMaterialType);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [rushOrder, setRushOrder] = useState(initialRushOrder);
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null);

  const { subscribeToPricing, unsubscribeFromPricing, webSocketConnected } =
    useRealTime();

  const pricingParams: PricingParams = {
    analysis_id: analysisId,
    maker_id: makerId,
    material_type: materialType,
    quantity,
    rush_order: rushOrder,
  };

  // Use cached pricing for better performance
  const {
    data: cachedPricing,
    isLoading: isCachedLoading,
    error: cachedError,
    refetch: refetchCached,
  } = useCachedPricing(pricingParams);

  // Manual calculation mutation
  const calculateMutation = useCalculatePricing();

  // Pricing configuration
  const { data: pricingConfig } = usePricingConfig();

  // Subscribe to real-time pricing updates
  useEffect(() => {
    if (enableRealTime && webSocketConnected) {
      subscribeToPricing(pricingParams);

      return () => {
        unsubscribeFromPricing(pricingParams);
      };
    }
  }, [
    enableRealTime,
    webSocketConnected,
    analysisId,
    makerId,
    materialType,
    quantity,
    rushOrder,
    subscribeToPricing,
    unsubscribeFromPricing,
  ]);

  // Handle pricing updates
  useEffect(() => {
    if (cachedPricing) {
      onPricingUpdate?.(cachedPricing);
      setLastCalculation(new Date());
    }
  }, [cachedPricing, onPricingUpdate]);

  // Manual recalculation
  const handleRecalculate = useCallback(async () => {
    try {
      const request: PricingRequest = {
        analysis_id: analysisId,
        maker_id: makerId,
        material_type: materialType,
        quantity,
        rush_order: rushOrder,
      };

      const result = await calculateMutation.mutateAsync(request);
      onPricingUpdate?.(result);
      setLastCalculation(new Date());

      // Invalidate cached data to force refresh
      refetchCached();

      toast.success("Pricing updated successfully");
    } catch (error) {
      console.error("Error calculating pricing:", error);
    }
  }, [
    analysisId,
    makerId,
    materialType,
    quantity,
    rushOrder,
    calculateMutation,
    onPricingUpdate,
    refetchCached,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDelivery = (days: number) => {
    if (days === 1) return "1 day";
    if (days < 7) return `${days} days`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  };

  const currentPricing = cachedPricing;
  const isLoading = isCachedLoading || calculateMutation.isPending;
  const error = cachedError || calculateMutation.error;

  const materialTypes = [
    "PLA",
    "ABS",
    "PETG",
    "TPU",
    "ASA",
    "PC",
    "Nylon",
    "Wood Fill",
    "Metal Fill",
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pricing Calculator
          </CardTitle>
          <div className="flex items-center gap-2">
            {enableRealTime && webSocketConnected && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Live Updates
              </Badge>
            )}
            {lastCalculation && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {lastCalculation.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        {showControls && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material Type</Label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rush" className="flex items-center gap-2">
                  Rush Order
                  {pricingConfig && (
                    <Badge variant="outline" className="text-xs">
                      +{(pricingConfig.rush_order_premium * 100).toFixed(0)}%
                    </Badge>
                  )}
                </Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="rush"
                    checked={rushOrder}
                    onCheckedChange={setRushOrder}
                  />
                  <span className="text-sm text-muted-foreground">
                    {rushOrder ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message ||
                "Failed to calculate pricing. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !currentPricing && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="w-6 h-6 mr-3" />
            <span className="text-sm text-muted-foreground">
              Calculating pricing...
            </span>
          </div>
        )}

        {/* Pricing Display */}
        {currentPricing && (
          <>
            {/* Quick Summary */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(currentPricing.total)}
                  </div>
                  {quantity > 1 && (
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(currentPricing.per_unit_cost)} per unit
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDelivery(currentPricing.estimated_delivery_days)}
                </div>
                {rushOrder && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Rush Order
                  </Badge>
                )}
              </div>
            </div>

            {/* Detailed Breakdown */}
            {showBreakdown && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Cost Breakdown
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Material Cost ({materialType})
                    </span>
                    <span className="font-medium">
                      {formatCurrency(currentPricing.material_cost)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Labor Cost
                    </span>
                    <span className="font-medium">
                      {formatCurrency(currentPricing.labor_cost)}
                    </span>
                  </div>

                  {currentPricing.complexity_premium > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Complexity Premium
                      </span>
                      <span className="font-medium">
                        {formatCurrency(currentPricing.complexity_premium)}
                      </span>
                    </div>
                  )}

                  {currentPricing.rush_premium > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Rush Order Premium
                      </span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(currentPricing.rush_premium)}
                      </span>
                    </div>
                  )}

                  {currentPricing.quantity_discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Quantity Discount
                      </span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(currentPricing.quantity_discount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Platform Fee
                    </span>
                    <span className="font-medium">
                      {formatCurrency(currentPricing.platform_fee)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="font-medium">
                      {formatCurrency(currentPricing.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(currentPricing.total)}
                    </span>
                  </div>
                </div>

                {/* Applied Discount */}
                {currentPricing.applied_discount && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Discount "{currentPricing.applied_discount.code}" applied:
                      {formatCurrency(
                        currentPricing.applied_discount.amount
                      )}{" "}
                      saved
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Currency: {currentPricing.currency}
                </div>
                {enableRealTime && webSocketConnected && (
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Prices update automatically when settings change
                  </div>
                )}
                {quantity >= 10 && pricingConfig && (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    Quantity discount available for bulk orders
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* No Data State */}
        {!isLoading && !currentPricing && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pricing data available</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              className="mt-2"
            >
              Calculate Pricing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PricingCalculator;
