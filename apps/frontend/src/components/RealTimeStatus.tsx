/**
 * Real-time Status Component
 * Displays the current status of real-time connections
 */
import React from "react";
import { useRealTime } from "@/contexts/RealTimeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw, Clock, AlertCircle } from "lucide-react";

interface RealTimeStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function RealTimeStatus({
  showDetails = false,
  className,
}: RealTimeStatusProps) {
  const { webSocketConnected, pollingActive, lastUpdate, error, reconnect } =
    useRealTime();

  const getStatusInfo = () => {
    if (webSocketConnected) {
      return {
        status: "connected",
        icon: Wifi,
        color: "bg-green-500",
        text: "Real-time",
        description: "Connected to real-time updates",
      };
    } else if (pollingActive) {
      return {
        status: "polling",
        icon: RefreshCw,
        color: "bg-yellow-500",
        text: "Polling",
        description: "Using polling for updates",
      };
    } else if (error) {
      return {
        status: "error",
        icon: AlertCircle,
        color: "bg-red-500",
        text: "Error",
        description: error,
      };
    } else {
      return {
        status: "disconnected",
        icon: WifiOff,
        color: "bg-gray-500",
        text: "Offline",
        description: "No real-time connection",
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
              <StatusIcon className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{statusInfo.text}</div>
              <div className="text-muted-foreground">
                {statusInfo.description}
              </div>
              {lastUpdate && (
                <div className="text-xs mt-1">
                  Last update: {formatLastUpdate(lastUpdate)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
        <StatusIcon className="w-5 h-5" />
        <div>
          <div className="font-medium text-sm">{statusInfo.text}</div>
          <div className="text-xs text-muted-foreground">
            {statusInfo.description}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {lastUpdate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatLastUpdate(lastUpdate)}
          </div>
        )}

        {(error || !webSocketConnected) && (
          <Button
            variant="outline"
            size="sm"
            onClick={reconnect}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
}

export default RealTimeStatus;
