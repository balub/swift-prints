import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Clock,
  Zap,
  Package,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

interface AnalysisResult {
  filament_g: number;
  filament_mm: number;
  print_time: string;
  filename: string;
}

interface ResultsCardProps {
  result: AnalysisResult;
  onCalculateCost: () => void;
}

const ResultsCard = ({ result, onCalculateCost }: ResultsCardProps) => {
  return (
    <Card className="border border-border bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-text-primary">
                Analysis Complete
              </h3>
              <p className="text-sm text-text-muted">Ready for pricing</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-primary/20"
          >
            {result.filename}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">
                  Filament Weight
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {result.filament_g}g
                </p>
                <p className="text-xs text-blue-600">PLA Material</p>
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
                  Filament Length
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {(result.filament_mm / 1000).toFixed(1)}m
                </p>
                <p className="text-xs text-purple-600">Total usage</p>
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
                  {result.print_time}
                </p>
                <p className="text-xs text-orange-600">Estimated duration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Estimate Preview */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Estimated Cost Range
                </p>
                <p className="text-lg font-semibold text-primary">
                  $8.50 - $12.30
                </p>
                <p className="text-xs text-text-muted">
                  Based on local maker rates
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Per maker</p>
              <p className="text-sm font-medium text-text-primary">
                Varies by location
              </p>
            </div>
          </div>
        </div>

        {/* Material Info */}
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                Material Details
              </p>
              <div className="flex items-center space-x-4 text-sm text-text-muted">
                <span>• PLA (Standard)</span>
                <span>• 0.2mm layer height</span>
                <span>• 20% infill</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Standard Quality
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onCalculateCost}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            Find Local Makers
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <div className="text-center">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-text-muted hover:text-primary transition-colors duration-200"
            >
              Upload Different File
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { ResultsCard };
