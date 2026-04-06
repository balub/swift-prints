import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploadBox } from "@/components/FileUploadBox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Users,
  Clock,
  Shield,
  Star,
  Zap,
  CheckCircle,
  Sparkles,
  Package,
  TrendingUp,
} from "lucide-react";
import { useAnalyzeUpload, type UploadResponse } from "@/services";
import { ContextBanner } from "@/components/ContextBanner";

const Landing = () => {
  const [analysisResult, setAnalysisResult] = useState<UploadResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const analyzeMutation = useAnalyzeUpload();

  const handleFileUpload = async (file: File) => {
    analyzeMutation.mutate(file, {
      onSuccess: (data) => {
        setAnalysisResult(data);
        setError(null);
      },
      onError: (err: Error) => {
        setError(err.message);
        setAnalysisResult(null);
      },
    });
  };

  const handleContinue = () => {
    if (analysisResult) {
      navigate("/order", { state: { upload: analysisResult } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-24 pb-20 text-center">
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-text-primary mb-8">
              Get Your 3D Prints{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent font-medium">
                Fast & Easy
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
              Upload your STL file and get instant analysis with real pricing
              from our backend.
              <span className="text-text-primary font-medium">
                {" "}
                Connected to actual 3D printing services.
              </span>
            </p>

            {/* Upload Section */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-border/50">
                <FileUploadBox
                  onFileUpload={handleFileUpload}
                  isAnalyzing={analyzeMutation.isPending}
                  error={error}
                />
              </div>

              {/* Analysis Results */}
              {analysisResult && (
                <Card className="mt-8 animate-in border border-border bg-card shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-text-primary">
                            Analysis Complete
                          </h3>
                          <p className="text-sm text-text-muted">
                            Ready for printing
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
                        {analysisResult.filename}
                      </Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              Filament
                            </p>
                            <p className="text-2xl font-bold text-blue-900">
                              {analysisResult.baseEstimate.filamentGrams.toFixed(
                                1
                              )}
                              g
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-purple-700">
                              Volume
                            </p>
                            <p className="text-2xl font-bold text-purple-900">
                              {(analysisResult.volumeMm3 / 1000).toFixed(1)} cm³
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 border border-orange-200/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-700">
                              Print Time
                            </p>
                            <p className="text-2xl font-bold text-orange-900">
                              {analysisResult.baseEstimate.printTimeHours.toFixed(
                                1
                              )}
                              h
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Model Info */}
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary mb-1">
                            Model Dimensions
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-text-muted">
                            <span>
                              X: {analysisResult.boundingBox.x.toFixed(1)}mm
                            </span>
                            <span>
                              Y: {analysisResult.boundingBox.y.toFixed(1)}mm
                            </span>
                            <span>
                              Z: {analysisResult.boundingBox.z.toFixed(1)}mm
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            analysisResult.needsSupports ? "default" : "outline"
                          }
                        >
                          {analysisResult.needsSupports
                            ? "Needs Supports"
                            : "No Supports"}
                        </Badge>
                      </div>
                    </div>

                    {/* Cost Estimate Preview */}
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              Ready for Pricing
                            </p>
                            <p className="text-xs text-text-muted">
                              Select a printer and filament for exact pricing
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleContinue}
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                      size="lg"
                    >
                      Continue to Print Studio
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 text-primary border-primary/20"
            >
              Simple Process
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-light text-text-primary mb-6">
              How It Works
            </h2>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              A complete 3D printing workflow from STL upload to tracked,
              finished prints.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <ArrowRight className="w-10 h-10 text-blue-600 rotate-90" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Upload & Analyze
              </h3>
              <p className="text-text-muted leading-relaxed">
                Upload your STL file. Our analysis engine evaluates it for
                volume, dimensions, and print estimates.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Select Options
              </h3>
              <p className="text-text-muted leading-relaxed">
                Choose from available printers and filaments. Get real-time
                pricing through our API.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <Shield className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Place Order
              </h3>
              <p className="text-text-muted leading-relaxed">
                Submit your order and track its status. Full order management
                through our admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment / platform context banner */}
      <ContextBanner />
    </div>
  );
};

export default Landing;
