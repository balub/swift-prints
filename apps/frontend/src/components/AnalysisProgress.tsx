/**
 * Analysis Progress Component
 * Displays real-time file analysis progress via WebSocket
 */
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFileAnalysis } from "@/hooks/useFileAnalysis";
import { AnalysisResultResponse } from "@/types/api";
import {
  FileSearch,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react";

interface AnalysisProgressProps {
  jobId: string;
  onComplete?: (result: AnalysisResultResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function AnalysisProgress({
  jobId,
  onComplete,
  onError,
  className,
}: AnalysisProgressProps) {
  const {
    progress,
    status,
    result,
    error,
    wsConnected,
    retryAnalysis,
    getAnalysisMetrics,
  } = useFileAnalysis({
    onAnalysisComplete: onComplete,
    onAnalysisError: onError,
    enableRealTimeUpdates: true,
    enableNotifications: false, // Disable notifications in this component
  });

  const getStatusInfo = () => {
    switch (status) {
      case "pending":
        return {
          icon: Clock,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          text: "Queued",
          description: "Analysis is queued for processing",
        };
      case "processing":
        return {
          icon: FileSearch,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          text: "Analyzing",
          description: "Analyzing your STL file...",
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          text: "Complete",
          description: "Analysis completed successfully",
        };
      case "failed":
        return {
          icon: AlertCircle,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          text: "Failed",
          description: error || "Analysis failed",
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          text: "Unknown",
          description: "Status unknown",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatAnalysisResult = (result: AnalysisResultResponse) => {
    return {
      "Print Time": `${result.metrics.print_time_hours.toFixed(1)} hours`,
      Material: `${result.metrics.filament_grams.toFixed(1)}g`,
      Volume: `${(result.metrics.volume_mm3 / 1000).toFixed(1)} cm³`,
      Complexity: result.metrics.complexity_score.toFixed(1),
      Supports: result.metrics.supports_required ? "Required" : "Not required",
    };
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            File Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {wsConnected && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Live Updates
              </Badge>
            )}
            {status === "failed" && (
              <Button variant="outline" size="sm" onClick={retryAnalysis}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className={`p-4 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
            <div>
              <div className="font-medium">{statusInfo.text}</div>
              <div className="text-sm text-muted-foreground">
                {statusInfo.description}
              </div>
            </div>
          </div>

          {status === "processing" && (
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {result && status === "completed" && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Analysis Results</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(formatAnalysisResult(result)).map(
                ([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {error && status === "failed" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Job ID: {jobId.slice(-8)}
          {wsConnected && (
            <div className="flex items-center gap-1 mt-1">
              <Zap className="w-3 h-3" />
              Real-time updates enabled
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalysisProgress;
