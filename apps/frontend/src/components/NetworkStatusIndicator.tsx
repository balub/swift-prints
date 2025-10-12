/**
 * Network Status Indicator Component
 * Shows network connectivity status to users
 */
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Signal } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface NetworkStatusIndicatorProps {
  showWhenOnline?: boolean;
  className?: string;
}

export function NetworkStatusIndicator({
  showWhenOnline = false,
  className = "",
}: NetworkStatusIndicatorProps) {
  const networkStatus = useNetworkStatus();

  // Don't show anything if online and showWhenOnline is false
  if (networkStatus.online && !showWhenOnline) {
    return null;
  }

  const getConnectionQuality = () => {
    if (!networkStatus.online) return "offline";

    const effectiveType = networkStatus.effectiveType;
    switch (effectiveType) {
      case "slow-2g":
      case "2g":
        return "poor";
      case "3g":
        return "fair";
      case "4g":
        return "good";
      default:
        return "unknown";
    }
  };

  const connectionQuality = getConnectionQuality();

  if (!networkStatus.online) {
    return (
      <Alert variant="destructive" className={className}>
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          You are currently offline. Some features may not be available.
        </AlertDescription>
      </Alert>
    );
  }

  if (showWhenOnline) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge
          variant={connectionQuality === "good" ? "default" : "secondary"}
          className="flex items-center space-x-1"
        >
          {connectionQuality === "poor" ? (
            <Signal className="h-3 w-3" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}
          <span className="capitalize">
            {connectionQuality === "unknown" ? "Online" : connectionQuality}
          </span>
        </Badge>

        {networkStatus.effectiveType && (
          <span className="text-xs text-muted-foreground">
            {networkStatus.effectiveType.toUpperCase()}
          </span>
        )}

        {networkStatus.downlink && (
          <span className="text-xs text-muted-foreground">
            {networkStatus.downlink.toFixed(1)} Mbps
          </span>
        )}
      </div>
    );
  }

  return null;
}

export default NetworkStatusIndicator;
