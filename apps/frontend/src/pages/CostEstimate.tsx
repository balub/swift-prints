import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calculator, Users } from 'lucide-react';

interface AnalysisResult {
  filament_g: number;
  filament_mm: number;
  print_time: string;
  filename: string;
}

const CostEstimate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = location.state?.analysis as AnalysisResult;

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-text-primary mb-4">No Analysis Data</h1>
          <p className="text-text-muted mb-6">Please upload a file first to see cost estimates.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
        </div>
      </div>
    );
  }

  // Mock cost calculations
  const filamentCost = (analysis.filament_g * 0.03).toFixed(2); // $0.03 per gram
  const machineTime = 8.50; // Base machine time cost
  const total = (parseFloat(filamentCost) + machineTime).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-light text-text-primary">Cost Estimate</h1>
        </div>

        <div className="grid gap-6">
          {/* File Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-primary" />
                Print Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">File:</span>
                  <span className="ml-2 font-medium">{analysis.filename}</span>
                </div>
                <div>
                  <span className="text-text-muted">Print Time:</span>
                  <span className="ml-2 font-medium">{analysis.print_time}</span>
                </div>
                <div>
                  <span className="text-text-muted">Filament:</span>
                  <span className="ml-2 font-medium">{analysis.filament_g}g</span>
                </div>
                <div>
                  <span className="text-text-muted">Material:</span>
                  <span className="ml-2 font-medium">PLA (Standard)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Filament Cost ({analysis.filament_g}g × $0.03)</span>
                  <span className="font-medium">${filamentCost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Machine Time ({analysis.print_time})</span>
                  <span className="font-medium">${machineTime.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-medium border-t border-border">
                  <span>Estimated Total</span>
                  <span className="text-primary">${total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Ready to Print?
            </h3>
            <p className="text-text-muted mb-4">
              Browse our verified makers to get competitive quotes for your project.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/makers', { state: { analysis, estimate: total } })}
            >
              <Users className="w-5 h-5 mr-2" />
              Find Local Makers
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostEstimate;