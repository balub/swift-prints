/**
 * Pricing Breakdown Card Component
 * Displays detailed pricing breakdown with visual indicators
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PricingBreakdown } from "@/types/api";
import {
  DollarSign,
  Package,
  Clock,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

interface PricingBreakdownCardProps {
  pricing: PricingBreakdown;
  materialType?: string;
  quantity?: number;
  showPercentages?: boolean;
  showComparison?: boolean;
  comparisonBaseline?: number;
  className?: string;
}

export function PricingBreakdownCard({
  pricing,
  materialType,
  quantity = 1,
  showPercentages = true,
  showComparison = false,
  comparisonBaseline,
  className,
}: PricingBreakdownCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: pricing.currency || "USD",
    }).format(amount);
  };

  const formatPercentage = (amount: number, total: number) => {
    if (total === 0) return "0%";
    return `${((amount / total) * 100).toFixed(1)}%`;
  };

  const getProgressValue = (amount: number, total: number) => {
    if (total === 0) return 0;
    return (amount / total) * 100;
  };

  const formatDelivery = (days: number) => {
    if (days === 1) return "1 day";
    if (days < 7) return `${days} days`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  };

  const getComparisonIndicator = () => {
    if (!showComparison || !comparisonBaseline) return null;

    const difference = pricing.total - comparisonBaseline;
    const percentDiff = (difference / comparisonBaseline) * 100;

    if (Math.abs(percentDiff) < 1) {
      return (
        <Badge variant="outline" className="text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Similar price
        </Badge>
      );
    }

    if (difference < 0) {
      return (
        <Badge variant="secondary" className="text-xs text-green-600">
          <TrendingDown className="w-3 h-3 mr-1" />
          {Math.abs(percentDiff).toFixed(1)}% lower
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs text-orange-600">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {percentDiff.toFixed(1)}% higher
      </Badge>
    );
  };

  const breakdownItems = [
    {
      label: "Material Cost",
      amount: pricing.material_cost,
      icon: Package,
      color: "bg-blue-500",
      description: materialType
        ? `${materialType} filament`
        : "Printing material",
    },
    {
      label: "Labor Cost",
      amount: pricing.labor_cost,
      icon: Clock,
      color: "bg-green-500",
      description: "Printing time and handling",
    },
    ...(pricing.complexity_premium > 0
      ? [
          {
            label: "Complexity Premium",
            amount: pricing.complexity_premium,
            icon: Zap,
            color: "bg-orange-500",
            description: "Additional cost for complex geometry",
          },
        ]
      : []),
    ...(pricing.rush_premium > 0
      ? [
          {
            label: "Rush Order Premium",
            amount: pricing.rush_premium,
            icon: Zap,
            color: "bg-red-500",
            description: "Expedited processing fee",
          },
        ]
      : []),
    ...(pricing.quantity_discount > 0
      ? [
          {
            label: "Quantity Discount",
            amount: -pricing.quantity_discount,
            icon: TrendingDown,
            color: "bg-green-600",
            description: "Bulk order savings",
          },
        ]
      : []),
    {
      label: "Platform Fee",
      amount: pricing.platform_fee,
      icon: DollarSign,
      color: "bg-gray-500",
      description: "Service and transaction fees",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing Breakdown
          </CardTitle>
          <div className="flex items-center gap-2">
            {getComparisonIndicator()}
            {pricing.applied_discount && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Discount Applied
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(pricing.total)}
            </div>
            {quantity > 1 && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(pricing.per_unit_cost)} per unit
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatDelivery(pricing.estimated_delivery_days)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Estimated delivery
            </div>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-3">
          {breakdownItems.map((item, index) => {
            const Icon = item.icon;
            const isDiscount = item.amount < 0;
            const displayAmount = Math.abs(item.amount);

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {showPercentages && (
                      <Badge variant="outline" className="text-xs">
                        {formatPercentage(displayAmount, pricing.subtotal)}
                      </Badge>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      isDiscount ? "text-green-600" : ""
                    }`}
                  >
                    {isDiscount ? "-" : ""}
                    {formatCurrency(displayAmount)}
                  </span>
                </div>

                {showPercentages && (
                  <Progress
                    value={getProgressValue(displayAmount, pricing.subtotal)}
                    className="h-1"
                  />
                )}

                <div className="text-xs text-muted-foreground ml-5">
                  {item.description}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Subtotal and Total */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              {formatCurrency(pricing.subtotal)}
            </span>
          </div>

          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span className="text-primary">
              {formatCurrency(pricing.total)}
            </span>
          </div>
        </div>

        {/* Applied Discount Details */}
        {pricing.applied_discount && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Discount Applied</span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              Code: {pricing.applied_discount.code} • Saved:{" "}
              {formatCurrency(pricing.applied_discount.amount)}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              All prices in {pricing.currency}
            </div>
            {quantity > 1 && (
              <div>
                Total quantity: {quantity} unit{quantity !== 1 ? "s" : ""}
              </div>
            )}
            {pricing.breakdown_details &&
              Object.keys(pricing.breakdown_details).length > 0 && (
                <div>Additional details available in breakdown</div>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PricingBreakdownCard;
