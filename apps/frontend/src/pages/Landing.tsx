import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploadBox } from "@/components/FileUploadBox";
import { ResultsCard } from "@/components/ResultsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Users,
  Clock,
  Shield,
  Star,
  Zap,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface AnalysisResult {
  filament_g: number;
  filament_mm: number;
  print_time: string;
  filename: string;
}

const Landing = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsAnalyzing(true);
    try {
      // Mock API call - in real app would call /api/analyze
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setAnalysisResult({
        filament_g: 25.4,
        filament_mm: 8500,
        print_time: "2h 34m",
        filename: file.name,
      });

      // Redirect to studio page with the uploaded file
      navigate("/studio", {
        state: {
          uploadedFile: file,
          analysis: {
            filament_g: 25.4,
            filament_mm: 8500,
            print_time: "2h 34m",
            filename: file.name,
          },
        },
      });
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFindMakers = () => {
    navigate("/makers", { state: { analysis: analysisResult } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-24 pb-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Trusted by 10,000+ makers worldwide</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-text-primary mb-8">
              Get Your 3D Prints from{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent font-medium">
                Local Makers
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-text-muted max-w-3xl mx-auto mb-12 leading-relaxed">
              Upload your STL file and get instant quotes from verified local 3D
              printing services.
              <span className="text-text-primary font-medium">
                {" "}
                Fast, reliable, and competitively priced.
              </span>
            </p>

            {/* Upload Section */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-border/50">
                <FileUploadBox
                  onFileUpload={handleFileUpload}
                  isAnalyzing={isAnalyzing}
                />
              </div>

              {analysisResult && (
                <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                  <ResultsCard
                    result={analysisResult}
                    onCalculateCost={handleFindMakers}
                  />
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/makers")}
                className="min-w-[200px] h-12 text-base font-medium border-2 hover:bg-primary hover:text-white transition-all duration-200"
              >
                <Users className="w-5 h-5 mr-2" />
                Browse Makers
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="min-w-[200px] h-12 text-base font-medium hover:bg-primary/10 transition-all duration-200"
              >
                See How It Works
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">10K+</div>
                <div className="text-sm text-text-muted">Active Makers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">50K+</div>
                <div className="text-sm text-text-muted">Prints Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">4.9★</div>
                <div className="text-sm text-text-muted">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">24h</div>
                <div className="text-sm text-text-muted">Avg. Delivery</div>
              </div>
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
              Our platform connects you with local 3D printing experts in three
              simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <ArrowRight className="w-10 h-10 text-blue-600 rotate-90" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Upload Your File
              </h3>
              <p className="text-text-muted leading-relaxed">
                Drag and drop your STL file to get instant analysis of print
                time, material usage, and cost estimates.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Choose Your Maker
              </h3>
              <p className="text-text-muted leading-relaxed">
                Browse local makers, compare prices, read reviews, and select
                the perfect match for your project.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Shield className="w-10 h-10 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Get Your Print
              </h3>
              <p className="text-text-muted leading-relaxed">
                Secure ordering with quality guarantee. Track your print from
                start to finish with real-time updates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-light text-text-primary mb-6">
              Why Choose Swift Prints?
            </h2>
            <p className="text-xl text-text-muted max-w-3xl mx-auto">
              We make 3D printing accessible, reliable, and affordable for
              everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Instant Quotes
              </h3>
              <p className="text-text-muted">
                Get accurate pricing in seconds, not hours. No waiting for
                manual estimates.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Quality Guarantee
              </h3>
              <p className="text-text-muted">
                All makers are verified and rated. We guarantee quality or your
                money back.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Fast Delivery
              </h3>
              <p className="text-text-muted">
                Local makers mean faster delivery. Most prints ready within
                24-48 hours.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Top Rated
              </h3>
              <p className="text-text-muted">
                4.9/5 average rating from thousands of satisfied customers.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Secure Payment
              </h3>
              <p className="text-text-muted">
                Safe and secure payment processing with buyer protection.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Local Community
              </h3>
              <p className="text-text-muted">
                Support local makers and build connections in your community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
