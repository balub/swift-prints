import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { ArrowLeft, MapPin, Star, Filter, Printer, Clock } from "lucide-react";

interface Maker {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  location: string;
  materials: string[];
  hourlyRate: number;
  pricePerGram: number;
  image: string;
  verified: boolean;
}

const mockMakers: Maker[] = [
  {
    id: "1",
    name: "TechPrint Solutions",
    rating: 4.8,
    reviews: 127,
    location: "Downtown, 2.3 miles",
    materials: ["PLA", "ABS", "PETG", "TPU"],
    hourlyRate: 15,
    pricePerGram: 0.025,
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200",
    verified: true,
  },
  {
    id: "2",
    name: "Precision Makers Co.",
    rating: 4.9,
    reviews: 89,
    location: "Westside, 3.7 miles",
    materials: ["PLA", "ABS", "Wood Fill", "Carbon Fiber"],
    hourlyRate: 18,
    pricePerGram: 0.035,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200",
    verified: true,
  },
  {
    id: "3",
    name: "Local Print Shop",
    rating: 4.6,
    reviews: 234,
    location: "Eastside, 1.8 miles",
    materials: ["PLA", "ABS", "PETG"],
    hourlyRate: 12,
    pricePerGram: 0.028,
    image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?w=200",
    verified: false,
  },
  {
    id: "4",
    name: "ProtoForge Studio",
    rating: 5.0,
    reviews: 45,
    location: "Northside, 4.2 miles",
    materials: ["PLA", "ABS", "PETG", "Nylon", "Metal Fill"],
    hourlyRate: 25,
    pricePerGram: 0.045,
    image: "https://images.unsplash.com/photo-1589254066213-a0c7dc853511?w=200",
    verified: true,
  },
];

const Makers = () => {
  const [makers, setMakers] = useState<Maker[]>(mockMakers);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMakers, setSelectedMakers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"rating" | "price" | "distance">(
    "rating"
  );
  const [minRating, setMinRating] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { analysis, estimate } = location.state || {};

  const filteredMakers = makers
    .filter(
      (maker) =>
        maker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        maker.location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((maker) => maker.rating >= minRating)
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "price":
          return a.pricePerGram - b.pricePerGram;
        case "distance":
          // Mock distance sorting - in real app would use actual coordinates
          return 0;
        default:
          return 0;
      }
    });

  const progressSteps = [
    { id: "upload", title: "Upload File", completed: true, current: false },
    { id: "analyze", title: "Analysis", completed: true, current: false },
    { id: "makers", title: "Choose Maker", completed: false, current: true },
    { id: "order", title: "Place Order", completed: false, current: false },
  ];

  const handleRequestPrint = (maker: Maker) => {
    navigate("/order", {
      state: {
        maker,
        analysis,
        estimate,
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
            <h1 className="text-3xl font-light text-text-primary">
              Choose Your Maker
            </h1>
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
                    {["PLA", "ABS", "PETG", "TPU"].map((material) => (
                      <button
                        key={material}
                        className="px-3 py-1 text-xs border border-border rounded-full hover:bg-primary/10 transition-colors"
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
                    <input type="checkbox" id="verified" className="rounded" />
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
                  Time: <strong>{analysis.print_time}</strong>
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMakers.map((maker) => (
            <Card
              key={maker.id}
              className="border border-border hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <img
                    src={maker.image}
                    alt={maker.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
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
                        <span className="ml-1">{maker.rating}</span>
                        <span className="ml-1">({maker.reviews})</span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-text-muted">
                      <MapPin className="w-4 h-4 mr-1" />
                      {maker.location}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-text-muted mb-2">Materials:</p>
                  <div className="flex flex-wrap gap-1">
                    {maker.materials.map((material) => (
                      <span
                        key={material}
                        className="px-2 py-1 bg-neutral-100 text-xs rounded-md text-text-secondary"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="bg-neutral-50 rounded-lg p-3 mb-3">
                    <div className="text-sm text-text-muted mb-1">
                      Estimated Cost
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      $
                      {analysis
                        ? (
                            analysis.filament_g * maker.pricePerGram +
                            2.5 * maker.hourlyRate
                          ).toFixed(2)
                        : "N/A"}
                    </div>
                    <div className="text-xs text-text-muted">
                      Based on {analysis?.filament_g}g material +{" "}
                      {analysis?.print_time} labor
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-text-muted">
                        <Clock className="w-4 h-4 mr-1" />
                        Hourly Rate
                      </div>
                      <div className="font-medium">${maker.hourlyRate}/hr</div>
                    </div>
                    <div>
                      <div className="flex items-center text-text-muted">
                        <Printer className="w-4 h-4 mr-1" />
                        Per Gram
                      </div>
                      <div className="font-medium">${maker.pricePerGram}/g</div>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleRequestPrint(maker)}
                >
                  Request Print
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMakers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted">
              No makers found matching your criteria.
            </p>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Makers;
