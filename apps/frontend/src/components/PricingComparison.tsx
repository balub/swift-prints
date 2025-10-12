/**
 * Pricing Comparison Component
 * Displays pricing comparison across multiple makers
 */
import React, { useState, useEffect } from "react";
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
import { useComparePrices } from "@/hooks/api/usePricing";
import { PriceComparisonRequest, MakerPriceComparison } from "@/types/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Calculator,
  TrendingUp,
  Clock,
  Star,
  MapPin,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface PricingComparisonProps {
  analysisId: string;
  defaultMaterialType?: string;
  defaultQuantity?: number;
  userLocation?: {
    lat: number;
    lng: number;
  };
  onMakerSelect?: (comparison: MakerPriceComparison) => void;
}

export function PricingComparison({
  analysisId,
  defaultMaterialType = "PLA",
  defaultQuantity = 1,
  userLocation,
  onMakerSelect,
}: PricingComparisonProps) {
  const [materialType, setMaterialType] = useState(defaultMaterialType);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [radiusKm, setRadiusKm] = useState(50);
  const [maxResults, setMaxResults] = useState(10);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "delivery">(
    "price"
  );
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  const comparePricesMutation = useComparePrices();

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

  const handleCompare = () => {
    const request: PriceComparisonRequest = {
      analysis_id: analysisId,
      material_type: materialType,
      quantity,
      location_lat: userLocation?.lat,
      location_lng: userLocation?.lng,
      radius_km: radiusKm,
      max_results: maxResults,
    };

    comparePricesMutation.mutate(request);
  };

  // Auto-compare when parameters change
  useEffect(() => {
    if (analysisId) {
      handleCompare();
    }
  }, [analysisId, materialType, quantity]);

  const sortedComparisons = React.useMemo(() => {
    if (!comparePricesMutation.data) return [];

    let filtered = comparePricesMutation.data;

    if (showVerifiedOnly) {
      filtered = filtered.filter((comp) => comp.verified);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.total_price - b.total_price;
        case "rating":
          return b.rating - a.rating;
        case "delivery":
          return a.estimated_delivery_days - b.estimated_delivery_days;
        default:
          return 0;
      }
    });
  }, [comparePricesMutation.data, sortBy, showVerifiedOnly]);

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

  return (
    <div className="space-y-6">
      {/* Comparison Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Price Comparison Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label htmlFor="radius">Search Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                min="1"
                max="1000"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value) || 50)}
                disabled={!userLocation}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxResults">Max Results</Label>
              <Input
                id="maxResults"
                type="number"
                min="1"
                max="50"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="verified-only"
                  checked={showVerifiedOnly}
                  onCheckedChange={setShowVerifiedOnly}
                />
                <Label htmlFor="verified-only">Verified makers only</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="sort">Sort by:</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: "price" | "rating" | "delivery") =>
                    setSortBy(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCompare}
              disabled={comparePricesMutation.isPending}
              variant="outline"
              size="sm"
            >
              {comparePricesMutation.isPending ? (
                <LoadingSpinner className="w-4 h-4 mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Update Comparison
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparePricesMutation.isPending && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="w-8 h-8 mr-3" />
            <span className="text-lg">Comparing prices across makers...</span>
          </CardContent>
        </Card>
      )}

      {comparePricesMutation.isError && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-destructive">
            <AlertCircle className="w-8 h-8 mr-3" />
            <div>
              <p className="text-lg font-medium">Failed to compare prices</p>
              <p className="text-sm text-muted-foreground mt-1">
                {comparePricesMutation.error?.message || "Please try again"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparePricesMutation.isSuccess && sortedComparisons.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mr-3" />
            <div>
              <p className="text-lg font-medium">No makers found</p>
              <p className="text-sm mt-1">
                Try expanding your search radius or changing material type
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Cards */}
      {sortedComparisons.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Found {sortedComparisons.length} maker
              {sortedComparisons.length !== 1 ? "s" : ""}
            </h3>
            <Badge variant="outline">
              <TrendingUp className="w-3 h-3 mr-1" />
              Sorted by {sortBy}
            </Badge>
          </div>

          <div className="grid gap-4">
            {sortedComparisons.map((comparison, index) => (
              <Card
                key={comparison.maker_id}
                className={`transition-all hover:shadow-md ${
                  index === 0 ? "ring-2 ring-primary/20" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold">
                          {comparison.maker_name}
                        </h4>
                        {comparison.verified && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {index === 0 && (
                          <Badge className="text-xs">
                            Best{" "}
                            {sortBy === "price"
                              ? "Price"
                              : sortBy === "rating"
                              ? "Rating"
                              : "Delivery"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current text-yellow-500" />
                          <span>{comparison.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatDelivery(comparison.estimated_delivery_days)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          <span>{comparison.total_prints} prints</span>
                        </div>
                        {!comparison.available && (
                          <Badge variant="destructive" className="text-xs">
                            Unavailable
                          </Badge>
                        )}
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Material Cost:</span>
                          <span>
                            {formatCurrency(
                              comparison.pricing_breakdown.material_cost
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Labor Cost:</span>
                          <span>
                            {formatCurrency(
                              comparison.pricing_breakdown.labor_cost
                            )}
                          </span>
                        </div>
                        {comparison.pricing_breakdown.complexity_premium >
                          0 && (
                          <div className="flex justify-between text-sm">
                            <span>Complexity Premium:</span>
                            <span>
                              {formatCurrency(
                                comparison.pricing_breakdown.complexity_premium
                              )}
                            </span>
                          </div>
                        )}
                        {comparison.pricing_breakdown.quantity_discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Quantity Discount:</span>
                            <span>
                              -
                              {formatCurrency(
                                comparison.pricing_breakdown.quantity_discount
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Platform Fee:</span>
                          <span>
                            {formatCurrency(
                              comparison.pricing_breakdown.platform_fee
                            )}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span className="text-lg">
                            {formatCurrency(comparison.total_price)}
                          </span>
                        </div>
                        {quantity > 1 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Per Unit:</span>
                            <span>
                              {formatCurrency(comparison.per_unit_price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      <Button
                        onClick={() => onMakerSelect?.(comparison)}
                        disabled={!comparison.available}
                        className="min-w-24"
                      >
                        {comparison.available ? "Select" : "Unavailable"}
                      </Button>

                      {comparison.pricing_breakdown.applied_discount && (
                        <Badge
                          variant="outline"
                          className="text-xs text-center"
                        >
                          {comparison.pricing_breakdown.applied_discount.code}{" "}
                          Applied
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingComparison;
