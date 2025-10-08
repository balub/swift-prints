import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Clock, Zap, Package } from 'lucide-react';

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
    <Card className="border border-border bg-card shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">
            Analysis Complete
          </h3>
          <div className="text-sm text-text-muted bg-neutral-50 px-3 py-1 rounded-full">
            {result.filename}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Filament</p>
              <p className="text-lg font-medium text-text-primary">
                {result.filament_g}g
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Length</p>
              <p className="text-lg font-medium text-text-primary">
                {(result.filament_mm / 1000).toFixed(1)}m
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Print Time</p>
              <p className="text-lg font-medium text-text-primary">
                {result.print_time}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-text-muted mb-1">Material</p>
          <p className="text-base font-medium text-text-primary">PLA (Standard)</p>
        </div>

        <Button 
          onClick={onCalculateCost}
          className="w-full"
          size="lg"
        >
          Calculate Cost
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export { ResultsCard };