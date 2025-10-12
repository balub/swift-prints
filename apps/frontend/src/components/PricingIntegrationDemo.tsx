/**
 * Pricing Integration Demo Component
 * Demonstrates all pricing calculation features and integrations
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PricingCalculator from "./PricingCalculator";
import PricingComparison from "./PricingComparison";
import PricingBreakdownCard from "./PricingBreakdownCard";
import PricingSessionManager from "./PricingSessionManager";
import PricingErrorFallback from "./PricingErrorFallback";
import { usePricingUpdates } from "@/hooks/usePricingUpdates";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  PricingBreakdown,
  PricingParams,
  PricingSession,
  MakerPriceComparison,
} from "@/types/api";
import {
  Calculator,
  TrendingUp,
  Zap,
  Settings,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";

interface PricingIntegrationDemoProps {
  analysisId?: string;
  makerId?: string;
  materialType?: string;
}

export function PricingIntegrationDemo({
  analysisId = "demo-analysis-123",
  makerId = "demo-maker-456",
  materialType = "PLA",
}: PricingIntegrationDemoProps) {
  const [activeTab, setActiveTab] = useState("calculator");
  const [quantity, setQuantity] = useState(1);
  const [rushOrder, setRushOrder] = useState(false);
  const [selectedMaker, setSelectedMaker] =
    useState<MakerPriceComparison | null>(null);
  const [currentPricing, setCurrentPricing] = useState<PricingBreakdown | null>(
    null
  );
  const [pricingSession, setPricingSession] = useState<PricingSession | null>(
    null
  );
  const [simulateError, setSimulateError] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const online = useNetworkStatus();

  // Real-time pricing updates
  const pricingUpdates = usePricingUpdates({
    onPricingUpdate: (pricing, params) => {
      setCurrentPricing(pricing);
      toast.success("Pricing updated in real-time!", {
        description: `New total: $${pricing.total.toFixed(2)}`,
      });
    },
    onError: (error) => {
      toast.error("Pricing update failed", {
        description: error,
      });
    },
    enableNotifications: true,
  });

  // Demo data for when real backend is not available
  const demoAnalysisData = {
    estimatedWeight: 25.5, // grams
    estimatedPrintTime: 2.5, // hours
    complexity: "medium",
  };

  const demoUserLocation = {
    lat: 37.7749,
    lng: -122.4194, // San Francisco
  };

  const handlePricingUpdate = (pricing: PricingBreakdown) => {
    setCurrentPricing(pricing);
  };

  const handleMakerSelect = (maker: MakerPriceComparison) => {
    setSelectedMaker(maker);
    setCurrentPricing(maker.pricing_breakdown);
    toast.success(`Selected maker: ${maker.maker_name}`);
  };

  const handleSessionReady = (session: PricingSession) => {
    setPricingSession(session);
    if (session.current_pricing) {
      setCurrentPricing(session.current_pricing);
    }
  };

  const simulateErrorScenario = () => {
    setSimulateError(true);
    setTimeout(() => setSimulateError(false), 5000);
  };

  const toggleRealTimeUpdates = () => {
    if (pricingUpdates.connected) {
      pricingUpdates.unsubscribeFromAll();
    } else {
      const params: PricingParams = {
        analysis_id: analysisId,
        maker_id: makerId,
        material_type: materialType,
        quantity,
        rush_order: rushOrder,
      };
      pricingUpdates.subscribeToPricing(params);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pricing Integration Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="demo-mode">Demo Mode:</Label>
                <Badge variant={demoMode ? "default" : "outline"}>
                  {demoMode ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label>Network:</Label>
                <Badge variant={online ? "default" : "destructive"}>
                  {online ? (
                    <>
                      <Wifi className="w-3 h-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label>Real-time:</Label>
                <Badge
                  variant={pricingUpdates.connected ? "default" : "outline"}
                >
                  {pricingUpdates.connected ? (
                    <>
                      <Zap className="w-3 h-3 mr-1" />
                      Connected ({pricingUpdates.subscribedCount})
                    </>
                  ) : (
                    "Disconnected"
                  )}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleRealTimeUpdates}
                variant="outline"
                size="sm"
              >
                {pricingUpdates.connected ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Updates
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Updates
                  </>
                )}
              </Button>

              <Button
                onClick={simulateErrorScenario}
                variant="outline"
                size="sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Simulate Error
              </Button>
            </div>
          </div>

          {/* Demo Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="analysis-id">Analysis ID</Label>
              <Input
                id="analysis-id"
                value={analysisId}
                readOnly
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maker-id">Maker ID</Label>
              <Input
                id="maker-id"
                value={makerId}
                readOnly
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                value={materialType}
                readOnly
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Status Alerts */}
          {pricingUpdates.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Real-time updates error: {pricingUpdates.error}
              </AlertDescription>
            </Alert>
          )}

          {pricingUpdates.lastUpdate && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Last pricing update:{" "}
                {pricingUpdates.lastUpdate.toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Demo Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="error">Error Handling</TabsTrigger>
        </TabsList>

        {/* Pricing Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PricingCalculator
              analysisId={analysisId}
              makerId={makerId}
              materialType={materialType}
              quantity={quantity}
              rushOrder={rushOrder}
              onPricingUpdate={handlePricingUpdate}
              showControls={true}
              showBreakdown={true}
              enableRealTime={true}
            />

            {currentPricing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Current Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-semibold">
                        ${currentPricing.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per Unit:</span>
                      <span>${currentPricing.per_unit_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>{currentPricing.estimated_delivery_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Currency:</span>
                      <span>{currentPricing.currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Price Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <PricingComparison
            analysisId={analysisId}
            defaultMaterialType={materialType}
            defaultQuantity={quantity}
            userLocation={demoUserLocation}
            onMakerSelect={handleMakerSelect}
          />

          {selectedMaker && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Selected maker: {selectedMaker.maker_name} - $
                {selectedMaker.total_price.toFixed(2)}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Pricing Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          {currentPricing ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PricingBreakdownCard
                pricing={currentPricing}
                materialType={materialType}
                quantity={quantity}
                showPercentages={true}
                showComparison={false}
              />

              <PricingBreakdownCard
                pricing={currentPricing}
                materialType={materialType}
                quantity={quantity}
                showPercentages={false}
                showComparison={true}
                comparisonBaseline={currentPricing.total * 1.1} // 10% higher baseline
              />
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No pricing data available. Please calculate pricing first.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Pricing Session Tab */}
        <TabsContent value="session" className="space-y-4">
          <PricingSessionManager
            analysisId={analysisId}
            onSessionReady={handleSessionReady}
            onPricingUpdate={(session) => {
              setPricingSession(session);
              if (session.current_pricing) {
                setCurrentPricing(session.current_pricing);
              }
            }}
            onMakerSelect={handleMakerSelect}
          />
        </TabsContent>

        {/* Error Handling Tab */}
        <TabsContent value="error" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PricingErrorFallback
              error={
                simulateError ? new Error("Simulated network error") : null
              }
              materialType={materialType}
              quantity={quantity}
              estimatedWeight={demoAnalysisData.estimatedWeight}
              estimatedPrintTime={demoAnalysisData.estimatedPrintTime}
              userLocation={demoUserLocation}
              onRetry={() => {
                toast.info("Retrying pricing calculation...");
                setSimulateError(false);
              }}
              onFallbackAccept={(price) => {
                toast.success(
                  `Fallback pricing accepted: $${price.toFixed(2)}`
                );
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle>Error Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setSimulateError(true)}
                  variant="outline"
                  className="w-full"
                >
                  Network Error
                </Button>
                <Button
                  onClick={() =>
                    toast.error("Timeout error", {
                      description: "Request timed out",
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Timeout Error
                </Button>
                <Button
                  onClick={() =>
                    toast.error("Server error", {
                      description: "Internal server error",
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Server Error
                </Button>
                <Button
                  onClick={() =>
                    toast.error("Auth error", {
                      description: "Authentication required",
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Auth Error
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Real-time Updates Status */}
      {pricingUpdates.connected && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-green-500" />
              <span>Real-time pricing updates active</span>
              <Badge variant="outline" className="text-xs">
                {pricingUpdates.subscribedCount} subscription
                {pricingUpdates.subscribedCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PricingIntegrationDemo;
