/**
 * STL Analysis Demo Component
 * Demonstrates the complete integration of file upload and analysis with the backend
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileUploadBox } from "./FileUploadBox";
import { AnalysisProgress } from "./AnalysisProgress";
import {
  UploadedFile,
  AnalysisResultResponse,
  PrintSettings,
} from "@/types/api";
import {
  FileText,
  Settings,
  Zap,
  CheckCircle,
  Clock,
  Layers,
  Package,
  Gauge,
  Wrench,
} from "lucide-react";

interface STLAnalysisDemoProps {
  className?: string;
}

export function STLAnalysisDemo({ className }: STLAnalysisDemoProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResultResponse | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Default print settings for analysis
  const defaultSettings: PrintSettings = {
    layer_height: 0.2,
    infill_density: 20,
    infill_pattern: "grid",
    supports: true,
    bed_adhesion: "brim",
    material_type: "PLA",
    nozzle_temperature: 210,
    bed_temperature: 60,
  };

  const handleUploadComplete = (file: UploadedFile) => {
    setUploadedFile(file);
    setAnalysisResult(null);
    setAnalysisComplete(false);
  };

  const handleAnalysisComplete = (result: AnalysisResultResponse) => {
    setAnalysisResult(result);
    setAnalysisComplete(true);
  };

  const handleAnalysisError = (error: string) => {
    console.error("Analysis failed:", error);
    setAnalysisComplete(false);
  };

  const resetDemo = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
    setCurrentJobId(null);
    setAnalysisComplete(false);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatAnalysisMetrics = (result: AnalysisResultResponse) => {
    return [
      {
        icon: Clock,
        label: "Print Time",
        value: `${result.metrics.print_time_hours.toFixed(1)} hours`,
        color: "text-blue-600",
      },
      {
        icon: Package,
        label: "Material",
        value: `${result.metrics.filament_grams.toFixed(1)}g`,
        color: "text-green-600",
      },
      {
        icon: Layers,
        label: "Volume",
        value: `${(result.metrics.volume_mm3 / 1000).toFixed(1)} cm³`,
        color: "text-purple-600",
      },
      {
        icon: Gauge,
        label: "Complexity",
        value: result.metrics.complexity_score.toFixed(1),
        color: "text-orange-600",
      },
      {
        icon: Wrench,
        label: "Supports",
        value: result.metrics.supports_required ? "Required" : "Not required",
        color: result.metrics.supports_required
          ? "text-red-600"
          : "text-green-600",
      },
    ];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            STL Analysis Integration Demo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload an STL file to see real-time analysis with WebSocket updates
          </p>
        </CardHeader>
      </Card>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            File Upload & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadBox
            onUploadComplete={handleUploadComplete}
            onAnalysisComplete={handleAnalysisComplete}
            analysisSettings={defaultSettings}
            autoStartAnalysis={true}
          />
        </CardContent>
      </Card>

      {/* File Information */}
      {uploadedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Uploaded File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Filename:</span>
                <p className="text-muted-foreground">
                  {uploadedFile.original_filename}
                </p>
              </div>
              <div>
                <span className="font-medium">Size:</span>
                <p className="text-muted-foreground">
                  {formatFileSize(uploadedFile.file_size)}
                </p>
              </div>
              <div>
                <span className="font-medium">File ID:</span>
                <p className="text-muted-foreground font-mono text-xs">
                  {uploadedFile.id}
                </p>
              </div>
              <div>
                <span className="font-medium">Uploaded:</span>
                <p className="text-muted-foreground">
                  {new Date(uploadedFile.uploaded_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Progress */}
      {currentJobId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Analysis Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisProgress
              jobId={currentJobId}
              onComplete={handleAnalysisComplete}
              onError={handleAnalysisError}
            />
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisComplete && analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formatAnalysisMetrics(analysisResult).map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <IconComponent className={`w-5 h-5 ${metric.color}`} />
                    <div>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className={`text-sm ${metric.color}`}>
                        {metric.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Analysis Details */}
            <div className="space-y-3">
              <h4 className="font-medium">Analysis Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Analysis ID:</span>
                  <p className="text-muted-foreground font-mono text-xs">
                    {analysisResult.id}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Analyzed At:</span>
                  <p className="text-muted-foreground">
                    {new Date(analysisResult.analyzed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Print Settings Used */}
            <div className="space-y-3">
              <h4 className="font-medium">Print Settings Used</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {Object.entries(analysisResult.settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {(uploadedFile || analysisResult) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button onClick={resetDemo} variant="outline">
                Upload Another File
              </Button>
              {analysisComplete && (
                <Badge variant="secondary" className="ml-auto">
                  Analysis Complete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default STLAnalysisDemo;
