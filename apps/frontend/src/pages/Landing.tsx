import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploadBox } from '@/components/FileUploadBox';
import { ResultsCard } from '@/components/ResultsCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Clock, Shield } from 'lucide-react';

interface AnalysisResult {
  filament_g: number;
  filament_mm: number;
  print_time: string;
  filename: string;
}

const Landing = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // Mock API call - in real app would call /api/analyze
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnalysisResult({
        filament_g: 25.4,
        filament_mm: 8500,
        print_time: '2h 34m',
        filename: file.name
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCalculateCost = () => {
    navigate('/cost-estimate', { state: { analysis: analysisResult } });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-text-primary mb-6">
            Get Your 3D Prints from{' '}
            <span className="text-primary">Local Makers</span>
          </h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload your STL file and get instant quotes from verified local 3D printing services. 
            Fast, reliable, and competitively priced.
          </p>

          {/* Upload Section */}
          <div className="max-w-2xl mx-auto mb-12">
            <FileUploadBox 
              onFileUpload={handleFileUpload}
              isAnalyzing={isAnalyzing}
            />
            
            {analysisResult && (
              <div className="mt-8">
                <ResultsCard 
                  result={analysisResult}
                  onCalculateCost={handleCalculateCost}
                />
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/makers')}
              className="min-w-[180px]"
            >
              <Users className="w-5 h-5 mr-2" />
              Browse Makers
            </Button>
            <Button 
              variant="ghost" 
              size="lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="min-w-[180px]"
            >
              See How It Works
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="py-16 border-t border-border">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-text-primary mb-4">
              Simple, Fast, Reliable
            </h2>
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              Our platform connects you with local 3D printing experts in three easy steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6 text-primary rotate-90" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">1. Upload Your File</h3>
              <p className="text-text-muted">
                Drag and drop your STL file to get instant analysis of print time and material usage.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">2. Choose Your Maker</h3>
              <p className="text-text-muted">
                Browse local makers, compare prices, and select the perfect match for your project.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">3. Get Your Print</h3>
              <p className="text-text-muted">
                Secure ordering with quality guarantee. Track your print from start to finish.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;