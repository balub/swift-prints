import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import {
  ArrowLeft,
  MapPin,
  Star,
  Filter,
  Printer,
  Clock,
  Package,
} from "lucide-react";
import { formatDurationFromHours } from "@/lib/utils";
import { useMakers } from "@/hooks/api/useMakers";
import { useMakerUpdates } from "@/hooks/useMakerUpdates";
import { MakerPublicResponse, MakerSearchFilters } from "@/types/api";
import { toast } from "sonner";
import { MakerCardSkeletonGrid } from "@/components/MakerCardSkeleton";
import ErrorFallback from "@/components/ErrorFallback";
import EmptyState from "@/components/EmptyState";

// Helper function to get unique materials from makers
const getUniqueMaterials = (makers: MakerPublicResponse[]): string[] => {
  const materials = new Set<string>();
  makers.forEach((maker) => {
    maker.material_types?.forEach((material) => {
      materials.add(material);
    });
  });
  return Array.from(materials);
};

// Helper function to calculate estimated cost
const calculateEstimatedCost = (
  maker: MakerPublicResponse,
  analysis: any
): number => {
  if (!analysis) return 0;

  // Use default pricing for estimation since we don't have detailed printer data in public response
  const defaultPricePerGram = 0.03; // Default PLA price
  const defaultHourlyRate = 15; // Default hourly rate

  // Calculate cost: material cost + labor cost (estimated)
  const materialCost = analysis.filament_grams * defaultPricePerGram;
  const laborCost = analysis.print_time_hours * defaultHourlyRate;

  return materialCost + laborCost;
};

const Makers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price" | "distance">(
    "rating"
  );
  const [minRating, setMinRating] = useState(0);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { analysis, estimate } = location.state || {};

  // Build search filters
  const searchFilters: MakerSearchFilters = {
    material_types:
      selectedMaterials.length > 0 ? selectedMaterials : undefined,
    min_rating: minRating > 0 ? minRating : undefined,
    verified_only: verifiedOnly,
    available_only: true,
    limit: 50,
    offset: 0,
  };

  // Fetch makers data
  const { data: makers = [], isLoading, error } = useMakers(searchFilters);

  // Set up real-time updates for maker availability
  const { connected: wsConnected } = useMakerUpdates({
    enableNotifications: false, // Don't show notifications for general availability updates
  });

  // Client-side filtering and sorting
  const filteredMakers = makers
    .filter(
      (maker) =>
        searchQuery === "" ||
        maker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        maker.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "price":
          // Sort by estimated cost
          const costA = calculateEstimatedCost(a, analysis);
          const costB = calculateEstimatedCost(b, analysis);
          return costA - costB;
        case "distance":
          // For now, sort by location string - in real app would use coordinates
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });

  // Get unique materials for filter options
  const availableMaterials = getUniqueMaterials(makers);

  // Handle material filter toggle
  const toggleMaterial = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  // Show error toast if API call fails
  useEffect(() => {
    if (error) {
      toast.error("Failed to load makers", {
        description: "Please try refreshing the page",
      });
    }
  }, [error]);

  const progressSteps = [
    { id: "upload", title: "Upload File", completed: true, current: false },
    { id: "analyze", title: "Analysis", completed: true, current: false },
    { id: "makers", title: "Choose Maker", completed: false, current: true },
    { id: "order", title: "Place Order", completed: false, current: false },
  ];

  const handleRequestPrint = (maker: MakerPublicResponse) => {
    navigate("/order", {
      state: {
        maker,
        analysis,
        estimate: calculateEstimatedCost(maker, analysis),
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator steps={progressSteps} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-light text-text-primary">
                Choose Your Maker
              </h1>
              <div className="flex items-center mt-1">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    wsConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm text-text-muted">
                  {wsConnected ? "Live updates active" : "Offline mode"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "rating" | "price" | "distance")
              }
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="rating">Sort by Rating</option>
              <option value="price">Sort by Price</option>
              <option value="distance">Sort by Distance</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">
                    Minimum Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                    <option value={4.8}>4.8+ Stars</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">
                    Materials
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableMaterials.map((material) => (
                      <button
                        key={material}
                        onClick={() => toggleMaterial(material)}
                        className={`px-3 py-1 text-xs border rounded-full transition-colors ${
                          selectedMaterials.includes(material)
                            ? "bg-primary text-white border-primary"
                            : "border-border hover:bg-primary/10"
                        }`}
                      >
                        {material}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-primary mb-2 block">
                    Verification
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="verified"
                      className="rounded"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                    />
                    <label
                      htmlFor="verified"
                      className="text-sm text-text-muted"
                    >
                      Verified Makers Only
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm">
                <span>
                  File: <strong>{analysis.filename}</strong>
                </span>
                <span>•</span>
                <span>
                  Material: <strong>{analysis.filament_g}g PLA</strong>
                </span>
                <span>•</span>
                <span>
                  Time:{" "}
                  <strong>
                    {typeof analysis.print_time_hours === "number"
                      ? formatDurationFromHours(analysis.print_time_hours)
                      : analysis.print_time}
                  </strong>
                </span>
              </div>
              {estimate && (
                <div className="text-sm text-primary font-medium">
                  Est. ${estimate}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <MakerCardSkeletonGrid count={6} />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorFallback
            error={error as Error}
            title="Failed to load makers"
            message="We couldn't load the makers list. Please check your connection and try again."
            showRetry={true}
            className="py-12"
          />
        )}

        {/* Makers Grid */}
        {!isLoading && !error && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMakers.map((maker) => {
              const estimatedCost = calculateEstimatedCost(maker, analysis);

              return (
                <Card
                  key={maker.id}
                  className="border border-border hover:shadow-md transition-shadow duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Printer className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-text-primary">
                            {maker.name}
                          </h3>
                          {maker.verified && (
                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-text-muted mb-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="ml-1">
                              {maker.rating.toFixed(1)}
                            </span>
                            <span className="ml-1">
                              ({maker.total_prints} prints)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-text-muted">
                          <MapPin className="w-4 h-4 mr-1" />
                          {maker.location_address || "Location not specified"}
                        </div>
                      </div>
                    </div>

                    {maker.description && (
                      <div className="mb-4">
                        <p className="text-sm text-text-muted line-clamp-2">
                          {maker.description}
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="text-sm text-text-muted mb-2">Materials:</p>
                      <div className="flex flex-wrap gap-1">
                        {maker.material_types.slice(0, 4).map((material) => (
                          <span
                            key={material}
                            className="px-2 py-1 bg-neutral-100 text-xs rounded-md text-text-secondary"
                          >
                            {material}
                          </span>
                        ))}
                        {maker.material_types.length > 4 && (
                          <span className="px-2 py-1 bg-neutral-100 text-xs rounded-md text-text-secondary">
                            +{maker.material_types.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="bg-neutral-50 rounded-lg p-3 mb-3">
                        <div className="text-sm text-text-muted mb-1">
                          Estimated Cost
                        </div>
                        <div className="text-lg font-semibold text-primary">
                          ${analysis ? estimatedCost.toFixed(2) : "N/A"}
                        </div>
                        <div className="text-xs text-text-muted">
                          {analysis
                            ? `Based on ${analysis.filament_grams}g material + ${formatDurationFromHours(
                                analysis.print_time_hours
                              )} labor`
                            : "Upload a file to see estimate"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center text-text-muted">
                            <Printer className="w-4 h-4 mr-1" />
                            Printers
                          </div>
                          <div className="font-medium">
                            {maker.printer_count} available
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center text-text-muted">
                            <Package className="w-4 h-4 mr-1" />
                            Materials
                          </div>
                          <div className="font-medium">
                            {maker.material_types.length} types
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleRequestPrint(maker)}
                      disabled={!maker.available}
                    >
                      {maker.available
                        ? "Request Print"
                        : "Currently Unavailable"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && filteredMakers.length === 0 && (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No makers found"
            description="We couldn't find any makers matching your criteria. Try adjusting your filters or search terms."
            action={{
              label: "Clear All Filters",
              onClick: () => {
                setSearchQuery("");
                setSelectedMaterials([]);
                setMinRating(0);
                setVerifiedOnly(false);
              },
            }}
            className="py-12"
          />
        )}
      </div>
    </div>
  );
};

export default Makers;
