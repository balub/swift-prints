/**
 * WebSocket Test Component
 * Test component to verify WebSocket integration functionality
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRealTime } from "@/contexts/RealTimeContext";
import { RealTimeStatus } from "@/components/RealTimeStatus";
import { PricingParams, PrintSettings } from "@/types/api";
import { Wifi, WifiOff, Send, TestTube, Activity, Zap } from "lucide-react";

export function WebSocketTest() {
  const {
    webSocketConnected,
    pollingActive,
    lastUpdate,
    error,
    subscribeToOrder,
    unsubscribeFromOrder,
    subscribeToPricing,
    unsubscribeFromPricing,
    subscribeToAnalysis,
    unsubscribeFromAnalysis,
    reconnect,
  } = useRealTime();

  const [testOrderId, setTestOrderId] = useState("test-order-123");
  const [testJobId, setTestJobId] = useState("test-job-456");
  const [subscribedOrders, setSubscribedOrders] = useState<Set<string>>(
    new Set()
  );
  const [subscribedAnalysis, setSubscribedAnalysis] = useState<Set<string>>(
    new Set()
  );
  const [subscribedPricing, setSubscribedPricing] = useState<boolean>(false);

  const testPricingParams: PricingParams = {
    analysis_id: "test-analysis-789",
    maker_id: "test-maker-101",
    settings: {
      layer_height: 0.2,
      infill_density: 20,
      infill_pattern: "grid",
      supports: true,
      bed_adhesion: "brim",
      material_type: "PLA",
      nozzle_temperature: 210,
      bed_temperature: 60,
    } as PrintSettings,
  };

  const handleSubscribeOrder = () => {
    if (testOrderId && !subscribedOrders.has(testOrderId)) {
      subscribeToOrder(testOrderId);
      setSubscribedOrders((prev) => new Set(prev).add(testOrderId));
    }
  };

  const handleUnsubscribeOrder = () => {
    if (testOrderId && subscribedOrders.has(testOrderId)) {
      unsubscribeFromOrder(testOrderId);
      setSubscribedOrders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(testOrderId);
        return newSet;
      });
    }
  };

  const handleSubscribeAnalysis = () => {
    if (testJobId && !subscribedAnalysis.has(testJobId)) {
      subscribeToAnalysis(testJobId);
      setSubscribedAnalysis((prev) => new Set(prev).add(testJobId));
    }
  };

  const handleUnsubscribeAnalysis = () => {
    if (testJobId && subscribedAnalysis.has(testJobId)) {
      unsubscribeFromAnalysis(testJobId);
      setSubscribedAnalysis((prev) => {
        const newSet = new Set(prev);
        newSet.delete(testJobId);
        return newSet;
      });
    }
  };

  const handleSubscribePricing = () => {
    if (!subscribedPricing) {
      subscribeToPricing(testPricingParams);
      setSubscribedPricing(true);
    }
  };

  const handleUnsubscribePricing = () => {
    if (subscribedPricing) {
      unsubscribeFromPricing(testPricingParams);
      setSubscribedPricing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            WebSocket Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Connection Status
            </h3>
            <RealTimeStatus showDetails={true} />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {webSocketConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span>
                  WebSocket: {webSocketConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {pollingActive ? (
                  <Zap className="w-4 h-4 text-yellow-500" />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <span>Polling: {pollingActive ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {lastUpdate && (
              <div className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleString()}
              </div>
            )}

            <Button onClick={reconnect} variant="outline" size="sm">
              Reconnect
            </Button>
          </div>

          <Separator />

          {/* Order Updates Test */}
          <div className="space-y-3">
            <h3 className="font-medium">Order Updates Test</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="order-id">Order ID</Label>
                <Input
                  id="order-id"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  placeholder="Enter order ID"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubscribeOrder}
                disabled={!testOrderId || subscribedOrders.has(testOrderId)}
                size="sm"
              >
                Subscribe
              </Button>
              <Button
                onClick={handleUnsubscribeOrder}
                disabled={!testOrderId || !subscribedOrders.has(testOrderId)}
                variant="outline"
                size="sm"
              >
                Unsubscribe
              </Button>
            </div>

            {subscribedOrders.size > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-sm text-muted-foreground">
                  Subscribed:
                </span>
                {Array.from(subscribedOrders).map((orderId) => (
                  <Badge key={orderId} variant="secondary" className="text-xs">
                    {orderId}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Analysis Updates Test */}
          <div className="space-y-3">
            <h3 className="font-medium">Analysis Updates Test</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="job-id">Job ID</Label>
                <Input
                  id="job-id"
                  value={testJobId}
                  onChange={(e) => setTestJobId(e.target.value)}
                  placeholder="Enter analysis job ID"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubscribeAnalysis}
                disabled={!testJobId || subscribedAnalysis.has(testJobId)}
                size="sm"
              >
                Subscribe
              </Button>
              <Button
                onClick={handleUnsubscribeAnalysis}
                disabled={!testJobId || !subscribedAnalysis.has(testJobId)}
                variant="outline"
                size="sm"
              >
                Unsubscribe
              </Button>
            </div>

            {subscribedAnalysis.size > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-sm text-muted-foreground">
                  Subscribed:
                </span>
                {Array.from(subscribedAnalysis).map((jobId) => (
                  <Badge key={jobId} variant="secondary" className="text-xs">
                    {jobId}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing Updates Test */}
          <div className="space-y-3">
            <h3 className="font-medium">Pricing Updates Test</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Analysis ID: {testPricingParams.analysis_id}</div>
              <div>Maker ID: {testPricingParams.maker_id}</div>
              <div>Material: {testPricingParams.settings.material_type}</div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubscribePricing}
                disabled={subscribedPricing}
                size="sm"
              >
                Subscribe
              </Button>
              <Button
                onClick={handleUnsubscribePricing}
                disabled={!subscribedPricing}
                variant="outline"
                size="sm"
              >
                Unsubscribe
              </Button>
            </div>

            {subscribedPricing && (
              <Badge variant="secondary" className="text-xs">
                Subscribed to pricing updates
              </Badge>
            )}
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="font-medium">Test Instructions</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Check that WebSocket connection is established</p>
              <p>2. Subscribe to order/analysis/pricing updates</p>
              <p>
                3. Trigger updates from the backend to test real-time
                functionality
              </p>
              <p>4. Verify that updates are received and displayed</p>
              <p>5. Test reconnection when connection is lost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebSocketTest;
