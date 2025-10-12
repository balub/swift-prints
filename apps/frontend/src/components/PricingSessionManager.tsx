/**
 * Pricing Session Manager Component
 * Manages real-time pricing sessions with dynamic updates
 */
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  useCreatePricingSession,
  useUpdatePricingSession,
  usePricingSession,
} from "@/hooks/api/usePricing";
import { useRealTime } from "@/contexts/RealTimeContext";
import {
  PricingSession,
  PricingUpdateRequest,
  MakerPriceComparison,
} from "@/types/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PricingBreakdownCard from "./PricingBreakdownCard";
import {
  Settings,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

interface PricingSessionManagerProps {
  analysisId: string;
  onSessionReady?: (session: PricingSession) => void;
  onPricingUpdate?: (session: PricingSession) => void;
  onMakerSelect?: (maker: MakerPriceComparison) => void;
}

export function PricingSessionManager({
  analysisId,
  onSessionReady,
  onPricingUpdate,
  onMakerSelect,
}: PricingSessionManagerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [materialType, setMaterialType] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [rushOrder, setRushOrder] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const createSessionMutation = useCreatePricingSession();
  const updateSessionMutation = useUpdatePricingSession();
  const { webSocketConnected } = useRealTime();

  // Get session data
  const {
    data: session,
    isLoading: isSessionLoading,
    error: sessionError,
    refetch: refetchSession,
  } = usePricingSession(sessionId || "");

  // Initialize session
  useEffect(() => {
    if (analysisId && !sessionId) {
      createSessionMutation.mutate(analysisId, {
        onSuccess: (newSession) => {
          setSessionId(newSession.session_id);
          setSessionExpiry(new Date(newSession.expires_at));

          // Set initial values from session
          if (newSession.available_materials.length > 0) {
            setMaterialType(newSession.available_materials[0]);
          }

          onSessionReady?.(newSession);
          toast.success("Pricing session created");
        },
      });
    }
  }, [analysisId, sessionId, createSessionMutation, onSessionReady]);

  // Update session expiry countdown
  useEffect(() => {
    if (!sessionExpiry) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = sessionExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [sessionExpiry]);

  // Handle session updates
  useEffect(() => {
    if (session) {
      onPricingUpdate?.(session);
    }
  }, [session, onPricingUpdate]);

  // Update pricing when parameters change
  const handleUpdatePricing = useCallback(
    async (updates: Partial<PricingUpdateRequest>) => {
      if (!sessionId) return;

      const updateRequest: PricingUpdateRequest = {
        material_type: updates.material_type || materialType,
        quantity: updates.quantity || quantity,
        rush_order:
          updates.rush_order !== undefined ? updates.rush_order : rushOrder,
      };

      try {
        await updateSessionMutation.mutateAsync({
          sessionId,
          updates: updateRequest,
        });

        // Refetch session to get updated data
        refetchSession();
      } catch (error) {
        console.error("Failed to update pricing:", error);
      }
    },
    [
      sessionId,
      materialType,
      quantity,
      rushOrder,
      updateSessionMutation,
      refetchSession,
    ]
  );

  // Auto-update when parameters change
  useEffect(() => {
    if (sessionId && materialType) {
      const timeoutId = setTimeout(() => {
        handleUpdatePricing({});
      }, 500); // Debounce updates

      return () => clearTimeout(timeoutId);
    }
  }, [materialType, quantity, rushOrder, sessionId, handleUpdatePricing]);

  const handleRefreshSession = () => {
    if (sessionId) {
      refetchSession();
    } else {
      createSessionMutation.mutate(analysisId);
    }
  };

  const isLoading =
    createSessionMutation.isPending ||
    updateSessionMutation.isPending ||
    isSessionLoading;
  const error =
    createSessionMutation.error || updateSessionMutation.error || sessionError;

  return (
    <div className="space-y-6">
      {/* Session Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pricing Session
            </CardTitle>
            <div className="flex items-center gap-2">
              {webSocketConnected && (
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Live Updates
                </Badge>
              )}
              {sessionId && (
                <Badge variant="secondary" className="text-xs">
                  <Timer className="w-3 h-3 mr-1" />
                  {timeRemaining}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSession}
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
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || "Failed to manage pricing session"}
              </AlertDescription>
            </Alert>
          )}

          {/* Session Controls */}
          {session && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material Type</Label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {session.available_materials.map((material) => (
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
                <Label htmlFor="rush">Rush Order</Label>
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
          )}

          {/* Session Info */}
          {session && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Session ID: {session.session_id}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires: {new Date(session.expires_at).toLocaleString()}
                </div>
                <div>
                  Available materials: {session.available_materials.join(", ")}
                </div>
                <div>
                  Maker options: {session.maker_options.length} available
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Pricing */}
      {session?.current_pricing && (
        <PricingBreakdownCard
          pricing={session.current_pricing}
          materialType={materialType}
          quantity={quantity}
          showPercentages={true}
        />
      )}

      {/* Maker Options */}
      {session?.maker_options && session.maker_options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Makers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.maker_options.slice(0, 3).map((maker) => (
                <div
                  key={maker.maker_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium">{maker.maker_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Rating: {maker.rating.toFixed(1)} •{maker.total_prints}{" "}
                      prints •{maker.estimated_delivery_days} days
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      ${maker.total_price.toFixed(2)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMakerSelect?.(maker)}
                      disabled={!maker.available}
                    >
                      {maker.available ? "Select" : "Unavailable"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !session && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner className="w-8 h-8 mr-3" />
            <span className="text-lg">Setting up pricing session...</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PricingSessionManager;
