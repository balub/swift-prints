import { useState, useEffect } from "react";
import { STLViewer } from "@/components/STLViewer";
import { Upload, IndianRupee, Info, Download, ShoppingCart, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import makersData from "@/data/makers.json";
import materialsData from "@/data/materials.json";

interface Material {
  type: string;
  name: string;
  description: string;
  priceRange: { min: number; max: number };
  icon: string;
}

interface Maker {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalPrints: number;
  verified: boolean;
  printers: Array<{
    hourlyRate: number;
    materials: Array<{
      type: string;
      pricePerGram: number;
      colors: Array<{
        name: string;
        hex: string;
        inStock: boolean;
      }>;
    }>;
  }>;
}

const PrintStudio = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<string>("");
  const [selectedMaker, setSelectedMaker] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock print analysis (in real app, would come from STL analysis)
  const [printAnalysis, setPrintAnalysis] = useState({
    filamentGrams: 0,
    printTimeHours: 0,
    volumeMm3: 0,
  });

  // Advanced options state - VASE MODE FIRST (moved to top)
  const [vaseMode, setVaseMode] = useState(false);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infillPercent, setInfillPercent] = useState(20);
  const [infillType, setInfillType] = useState("grid");
  const [needsSupports, setNeedsSupports] = useState(false);
  const [bedAdhesion, setBedAdhesion] = useState("brim");

  const makers = makersData as Maker[];

  // When vase mode is enabled, clear advanced options
  useEffect(() => {
    if (vaseMode) {
      setInfillPercent(0);
      setNeedsSupports(false);
      setBedAdhesion("none");
      setLayerHeight(0.2); // Reset to standard
    } else {
      // Reset to sensible defaults
      setInfillPercent(20);
      setBedAdhesion("brim");
    }
  }, [vaseMode]);

  // Mock analysis when file is uploaded
  useEffect(() => {
    if (uploadedFile) {
      // Simulate STL analysis with random-ish values
      setPrintAnalysis({
        filamentGrams: 25.4,
        printTimeHours: 2.5,
        volumeMm3: 31500,
      });
    }
  }, [uploadedFile]);

  // Get material+color combos (unique material+color pairs)
  const getMaterialColorCombos = () => {
    const comboMap = new Map<string, {
      id: string;
      material: string;
      color: string;
      hex: string;
      makers: Array<{
        makerId: string;
        makerName: string;
        pricePerGram: number;
        hourlyRate: number;
        rating: number;
        totalPrints: number;
        location: string;
        verified: boolean;
      }>;
    }>();

    makers.forEach((maker) => {
      maker.printers.forEach((printer) => {
        printer.materials.forEach((mat) => {
          mat.colors.forEach((color) => {
            if (color.inStock) {
              const comboKey = `${mat.type}-${color.name}`;

              if (!comboMap.has(comboKey)) {
                comboMap.set(comboKey, {
                  id: comboKey,
                  material: mat.type,
                  color: color.name,
                  hex: color.hex,
                  makers: [],
                });
              }

              comboMap.get(comboKey)!.makers.push({
                makerId: maker.id,
                makerName: maker.name,
                pricePerGram: mat.pricePerGram,
                hourlyRate: printer.hourlyRate,
                rating: maker.rating,
                totalPrints: maker.totalPrints,
                location: maker.location,
                verified: maker.verified,
              });
            }
          });
        });
      });
    });

    return Array.from(comboMap.values());
  };

  // Get available makers for selected material+color
  const getAvailableMakers = () => {
    if (!selectedCombo) return [];
    const combo = getMaterialColorCombos().find((c) => c.id === selectedCombo);
    if (!combo) return [];

    // Sort by rating and verified status
    return combo.makers.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return b.rating - a.rating;
    });
  };

  // Get recommended maker (highest rated, verified)
  const getRecommendedMaker = () => {
    const makers = getAvailableMakers();
    return makers[0]; // Already sorted
  };

  // Calculate estimated cost
  const calculateCost = () => {
    if (!uploadedFile || !selectedCombo) return null;

    const availableMakers = getAvailableMakers();
    if (availableMakers.length === 0) return null;

    // Use selected maker or recommend one
    const maker = selectedMaker
      ? availableMakers.find((m) => m.makerId === selectedMaker)
      : getRecommendedMaker();

    if (!maker) return null;

    const materialCost = printAnalysis.filamentGrams * maker.pricePerGram;
    const laborCost = printAnalysis.printTimeHours * maker.hourlyRate;
    const complexityPremium = (needsSupports ? 50 : 0) + (infillPercent > 50 ? 30 : 0);

    return {
      material: materialCost,
      labor: laborCost,
      complexity: complexityPremium,
      total: materialCost + laborCost + complexityPremium,
      maker: maker,
    };
  };

  const downloadDemoFile = () => {
    // Create a download link for the demo STL file
    const link = document.createElement('a');
    link.href = '/demo-cube.stl';
    link.download = 'demo-cube.stl';
    link.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith(".stl")) {
        setUploadedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const materialColorCombos = getMaterialColorCombos();
  const costEstimate = calculateCost();

  return (
    <div className="min-h-screen bg-background">
        {/* Desktop Split Layout */}
        <div className="hidden lg:grid lg:grid-cols-5 lg:h-screen">
          {/* LEFT PANEL - Controls (40%) */}
          <div className="col-span-2 border-r border-border overflow-y-auto">
            <div className="sticky top-0 bg-secondary/95 backdrop-blur-md border-b border-border z-10 px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-primary">Swift Prints</h1>
                  <p className="text-xs text-muted-foreground">
                    Local 3D printing, delivered fast
                  </p>
                </div>
                <div title="We're in beta - your feedback helps us improve!">
                  <Badge variant="outline" className="border-primary text-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Beta
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Upload Section */}
              <Card className="p-6 border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all">
                <div
                  className={`text-center ${isDragging ? "scale-105" : ""} transition-transform`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  {!uploadedFile ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Upload Your 3D Model</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag & drop your STL file or click to browse
                      </p>
                      <input
                        type="file"
                        accept=".stl"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-input"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button asChild variant="default" size="sm">
                          <label htmlFor="file-input" className="cursor-pointer">
                            <i className="fa fa-file-upload mr-2"></i>
                            Choose File
                          </label>
                        </Button>
                        <Button variant="outline" size="sm" onClick={downloadDemoFile} title="Download a sample cube to try the tool">
                          <Download className="w-4 h-4 mr-2" />
                          Download Demo
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Supported: STL files up to 50MB
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center">
                        <i className="fa fa-check text-primary text-xl"></i>
                      </div>
                      <div>
                        <p className="font-semibold truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {printAnalysis.filamentGrams}g filament
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFile(null)}
                        className="text-muted-foreground"
                      >
                        <i className="fa fa-trash mr-2"></i>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* 2. VASE MODE - FIRST! */}
              {uploadedFile && (
                <Card className="p-4 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span title="Vase Mode prints with a single continuous wall (no infill). Perfect for decorative vases, lamp shades, or artistic pieces!">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </span>
                      <Label htmlFor="vase-mode" className="font-semibold">
                        Vase Mode (Artistic Prints)
                      </Label>
                    </div>
                    <Switch id="vase-mode" checked={vaseMode} onCheckedChange={setVaseMode} />
                  </div>
                  {vaseMode && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Advanced options disabled - single-wall hollow print
                    </p>
                  )}
                </Card>
              )}

              {/* 3. Material + Color Selection (COMBINED!) */}
              {uploadedFile && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Choose Material & Color</Label>
                    <span title="Select from available material and color combinations based on maker inventory">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {materialColorCombos.slice(0, 12).map((combo) => {
                      const lowestPrice = Math.min(...combo.makers.map((m) => m.pricePerGram));
                      const makerCount = combo.makers.length;
                      return (
                        <div key={combo.id} className="relative">
                          <button
                            onClick={() => {
                              setSelectedCombo(combo.id);
                              setSelectedMaker(""); // Reset maker selection
                            }}
                            className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                              selectedCombo === combo.id
                                ? "border-primary bg-primary/5 scale-105"
                                : "border-border hover:border-primary/50"
                            }`}
                            title={`${combo.material} - ${combo.color} • ${makerCount} maker${makerCount > 1 ? 's' : ''} available`}
                          >
                            <div
                              className="w-full aspect-square rounded mb-1.5"
                              style={{ backgroundColor: combo.hex }}
                            />
                            <p className="text-xs font-semibold truncate">{combo.material}</p>
                            <p className="text-xs text-muted-foreground truncate">{combo.color}</p>
                            <p className="text-xs text-primary font-mono mt-0.5">from ₹{lowestPrice.toFixed(2)}/g</p>
                            {selectedCombo === combo.id && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <i className="fa fa-check text-white text-xs"></i>
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {materialColorCombos.length > 12 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View {materialColorCombos.length - 12} More Options
                    </Button>
                  )}
                </div>
              )}

              {/* 4. Maker Selection */}
              {selectedCombo && getAvailableMakers().length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Choose Your Maker</Label>
                    <span title="Select from verified makers who have this material in stock">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </span>
                  </div>
                  <div className="space-y-2">
                    {getAvailableMakers().map((maker, index) => {
                      const isRecommended = index === 0;
                      const isSelected = selectedMaker === maker.makerId;
                      return (
                        <Card
                          key={maker.makerId}
                          className={`p-3 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 border-2"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedMaker(maker.makerId)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm">{maker.makerName}</p>
                                {maker.verified && (
                                  <Badge variant="outline" className="text-xs border-primary text-primary px-1.5 py-0">
                                    <i className="fa fa-certificate text-xs mr-1"></i>
                                    Verified
                                  </Badge>
                                )}
                                {isRecommended && (
                                  <Badge className="text-xs bg-primary text-white px-1.5 py-0">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                                <span className="flex items-center gap-1">
                                  <i className="fa fa-star text-yellow-500"></i>
                                  {maker.rating.toFixed(1)}
                                </span>
                                <span>•</span>
                                <span>{maker.totalPrints} prints</span>
                                <span>•</span>
                                <span>{maker.location}</span>
                              </div>
                              <p className="text-xs text-primary font-mono font-semibold">
                                ₹{maker.pricePerGram.toFixed(2)}/g • ₹{maker.hourlyRate}/hr
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <i className="fa fa-check text-white text-xs"></i>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Advanced Options (Collapsed by default) */}
              {uploadedFile && !vaseMode && (
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <i className="fa fa-sliders text-primary"></i>
                      <span className="font-semibold text-sm">Advanced Settings</span>
                      <span title="Optional: Customize layer height, infill, and more">
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </span>
                    </div>
                    <i
                      className={`fa fa-chevron-${showAdvanced ? "up" : "down"} text-sm text-muted-foreground`}
                    ></i>
                  </button>

                  {showAdvanced && (
                    <div className="p-4 border-t border-border space-y-4 bg-muted/20">
                      {/* Layer Height */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Layer Height</Label>
                            <span title="Lower = smoother surface but longer print time. 0.2mm is recommended.">
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </span>
                          </div>
                          <span className="text-primary font-mono text-sm">{layerHeight}mm</span>
                        </div>
                        <Select value={layerHeight.toString()} onValueChange={(val) => setLayerHeight(parseFloat(val))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.1">0.1mm (High Quality)</SelectItem>
                            <SelectItem value="0.15">0.15mm (Fine)</SelectItem>
                            <SelectItem value="0.2">0.2mm (Recommended)</SelectItem>
                            <SelectItem value="0.25">0.25mm (Standard)</SelectItem>
                            <SelectItem value="0.3">0.3mm (Fast Draft)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Infill Percent */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Infill Density</Label>
                            <span title="Higher infill = stronger but heavier and more expensive. 20% is good for most prints.">
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </span>
                          </div>
                          <span className="text-primary font-mono text-sm">{infillPercent}%</span>
                        </div>
                        <Slider
                          value={[infillPercent]}
                          onValueChange={(vals) => setInfillPercent(vals[0])}
                          min={10}
                          max={100}
                          step={5}
                          className="py-2"
                        />
                      </div>

                      {/* Infill Type */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Infill Pattern</Label>
                          <span title="Grid is fastest. Honeycomb offers better strength. Gyroid is strongest but slower.">
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </span>
                        </div>
                        <Select value={infillType} onValueChange={setInfillType}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grid">Grid (Fast)</SelectItem>
                            <SelectItem value="honeycomb">Honeycomb (Balanced)</SelectItem>
                            <SelectItem value="gyroid">Gyroid (Strong)</SelectItem>
                            <SelectItem value="triangular">Triangular</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Supports */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="supports" className="text-sm">
                            Generate Supports
                          </Label>
                          <span title="Needed for overhangs above 45°. Adds to print time and material cost.">
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </span>
                        </div>
                        <Switch id="supports" checked={needsSupports} onCheckedChange={setNeedsSupports} />
                      </div>

                      {/* Bed Adhesion */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Bed Adhesion</Label>
                          <span title="Brim is recommended for most prints. Raft for difficult materials or warping issues.">
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </span>
                        </div>
                        <Select value={bedAdhesion} onValueChange={setBedAdhesion}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="skirt">Skirt (Light)</SelectItem>
                            <SelectItem value="brim">Brim (Recommended)</SelectItem>
                            <SelectItem value="raft">Raft (Maximum Adhesion)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* 6. Cost Estimate & Checkout */}
              {costEstimate && (
                <Card className="p-5 bg-primary/5 border-primary/30">
                  <div className="flex items-center gap-2 mb-4">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg">Estimated Cost</h3>
                  </div>

                  {/* Maker Details */}
                  <div className="mb-4 p-3 bg-background rounded-lg border border-border/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{costEstimate.maker.makerName}</p>
                          {costEstimate.maker.verified && (
                            <i className="fa fa-certificate text-xs text-primary" title="Verified maker"></i>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <i className="fa fa-star text-yellow-500"></i>
                            {costEstimate.maker.rating.toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>{costEstimate.maker.location}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {costEstimate.maker.totalPrints} successful prints
                    </p>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Material ({printAnalysis.filamentGrams}g @ ₹{costEstimate.maker.pricePerGram.toFixed(2)}/g)</span>
                      <span>₹{costEstimate.material.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Labor ({printAnalysis.printTimeHours.toFixed(1)}h @ ₹{costEstimate.maker.hourlyRate}/hr)
                      </span>
                      <span>₹{costEstimate.labor.toFixed(2)}</span>
                    </div>
                    {costEstimate.complexity > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Complexity Premium</span>
                        <span>₹{costEstimate.complexity.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                      <span className="font-semibold text-base">Total</span>
                      <span className="font-bold text-xl text-primary">₹{costEstimate.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Proceed to Checkout
                  </Button>
                </Card>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - STL Viewer (60%) */}
          <div className="col-span-3 bg-muted/20 flex flex-col">
            <div className="border-b border-border px-6 py-4 bg-secondary/95 backdrop-blur-md shadow-sm">
              <h2 className="text-lg font-semibold flex items-center">
                <i className="fa fa-cube mr-2 text-primary"></i>
                3D Preview
              </h2>
            </div>
            <div className="flex-1 p-6">
              {uploadedFile ? (
                <STLViewer file={uploadedFile} className="w-full h-full rounded-2xl shadow-lg" />
              ) : (
                <div className="w-full h-full rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/50">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-muted flex items-center justify-center">
                      <i className="fa fa-cube text-5xl text-muted-foreground"></i>
                    </div>
                    <h3 className="font-semibold text-xl mb-2">Upload a 3D Model</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Your interactive 3D preview will appear here once you upload an STL file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Experience */}
        <div className="lg:hidden min-h-screen bg-background">
          {/* Mobile Header */}
          <div className="sticky top-0 bg-secondary/95 backdrop-blur-md border-b border-border z-50 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-primary">Swift Prints</h1>
                <p className="text-xs text-muted-foreground">Local 3D printing, fast</p>
              </div>
              <Badge variant="outline" className="border-primary text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Beta
              </Badge>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Upload Section */}
            <Card className="p-4 border-2 border-dashed border-primary/20">
              <div
                className={`text-center ${isDragging ? "scale-105" : ""} transition-transform`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {!uploadedFile ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">Upload Your 3D Model</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Drag & drop or choose an STL file
                    </p>
                    <input
                      type="file"
                      accept=".stl"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="mobile-file-input"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button asChild variant="default" size="sm">
                        <label htmlFor="mobile-file-input" className="cursor-pointer">
                          <i className="fa fa-file-upload mr-2"></i>
                          Choose File
                        </label>
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadDemoFile}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Demo
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/20 flex items-center justify-center">
                      <i className="fa fa-check text-primary text-xl"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {printAnalysis.filamentGrams}g
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                      className="text-muted-foreground"
                    >
                      <i className="fa fa-trash mr-2"></i>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* 3D Preview Card */}
            {uploadedFile && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center">
                  <i className="fa fa-cube mr-2 text-primary"></i>
                  3D Preview
                </h3>
                <div className="w-full h-64 rounded-lg overflow-hidden bg-muted/20">
                  <STLViewer file={uploadedFile} className="w-full h-full" />
                </div>
              </Card>
            )}

            {/* Vase Mode Toggle */}
            {uploadedFile && (
              <Card className="p-4 border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="mobile-vase-mode" className="font-semibold text-sm">
                      Vase Mode (Artistic)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Single-wall hollow print</p>
                  </div>
                  <Switch id="mobile-vase-mode" checked={vaseMode} onCheckedChange={setVaseMode} />
                </div>
              </Card>
            )}

            {/* Material & Color Sheet */}
            {uploadedFile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Material & Color</h3>
                        {selectedCombo ? (
                          <p className="text-xs text-muted-foreground">
                            {materialColorCombos.find((c) => c.id === selectedCombo)?.material} •{" "}
                            {materialColorCombos.find((c) => c.id === selectedCombo)?.color}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Tap to choose</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Choose Material & Color</SheetTitle>
                    <SheetDescription>
                      Select from available material and color combinations
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    <div className="grid grid-cols-3 gap-3 pb-6">
                      {materialColorCombos.map((combo) => {
                        const lowestPrice = Math.min(...combo.makers.map((m) => m.pricePerGram));
                        return (
                          <div key={combo.id} className="relative">
                            <button
                              onClick={() => {
                                setSelectedCombo(combo.id);
                                setSelectedMaker(""); // Reset maker selection
                              }}
                              className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                                selectedCombo === combo.id
                                  ? "border-primary bg-primary/5 scale-105"
                                  : "border-border"
                              }`}
                            >
                              <div
                                className="w-full aspect-square rounded mb-1.5"
                                style={{ backgroundColor: combo.hex }}
                              />
                              <p className="text-xs font-semibold truncate">{combo.material}</p>
                              <p className="text-xs text-muted-foreground truncate">{combo.color}</p>
                              <p className="text-xs text-primary font-mono mt-0.5">from ₹{lowestPrice.toFixed(2)}/g</p>
                              {selectedCombo === combo.id && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <i className="fa fa-check text-white text-xs"></i>
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Maker Selection Sheet */}
            {selectedCombo && getAvailableMakers().length > 0 && (
              <Sheet>
                <SheetTrigger asChild>
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Choose Your Maker</h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedMaker
                            ? getAvailableMakers().find((m) => m.makerId === selectedMaker)?.makerName
                            : `${getAvailableMakers().length} makers available`}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Choose Your Maker</SheetTitle>
                    <SheetDescription>Select from verified makers with this material in stock</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 overflow-y-auto max-h-[calc(80vh-120px)] space-y-3 pb-6">
                    {getAvailableMakers().map((maker, index) => {
                      const isRecommended = index === 0;
                      const isSelected = selectedMaker === maker.makerId;
                      return (
                        <Card
                          key={maker.makerId}
                          className={`p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 border-2"
                              : "border-border"
                          }`}
                          onClick={() => setSelectedMaker(maker.makerId)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="font-semibold text-sm">{maker.makerName}</p>
                                {maker.verified && (
                                  <Badge variant="outline" className="text-xs border-primary text-primary">
                                    <i className="fa fa-certificate text-xs mr-1"></i>
                                    Verified
                                  </Badge>
                                )}
                                {isRecommended && (
                                  <Badge className="text-xs bg-primary text-white">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <i className="fa fa-star text-yellow-500"></i>
                                  {maker.rating.toFixed(1)}
                                </span>
                                <span>•</span>
                                <span>{maker.totalPrints} prints</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">{maker.location}</p>
                              <p className="text-xs text-primary font-mono font-semibold">
                                ₹{maker.pricePerGram.toFixed(2)}/g • ₹{maker.hourlyRate}/hr
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <i className="fa fa-check text-white text-sm"></i>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Advanced Options Sheet */}
            {uploadedFile && !vaseMode && (
              <Sheet>
                <SheetTrigger asChild>
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm mb-1 flex items-center">
                          <i className="fa fa-sliders text-primary mr-2"></i>
                          Advanced Settings
                        </h3>
                        <p className="text-xs text-muted-foreground">Optional: Customize your print</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh]">
                  <SheetHeader>
                    <SheetTitle>Advanced Settings</SheetTitle>
                    <SheetDescription>Customize layer height, infill, and more</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)] pb-6">
                    {/* Layer Height */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Layer Height</Label>
                        <span className="text-primary font-mono text-sm">{layerHeight}mm</span>
                      </div>
                      <Select value={layerHeight.toString()} onValueChange={(val) => setLayerHeight(parseFloat(val))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.1">0.1mm (High Quality)</SelectItem>
                          <SelectItem value="0.15">0.15mm (Fine)</SelectItem>
                          <SelectItem value="0.2">0.2mm (Recommended)</SelectItem>
                          <SelectItem value="0.25">0.25mm (Standard)</SelectItem>
                          <SelectItem value="0.3">0.3mm (Fast Draft)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Lower = smoother surface but longer print time
                      </p>
                    </div>

                    {/* Infill Percent */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Infill Density</Label>
                        <span className="text-primary font-mono text-sm">{infillPercent}%</span>
                      </div>
                      <Slider
                        value={[infillPercent]}
                        onValueChange={(vals) => setInfillPercent(vals[0])}
                        min={10}
                        max={100}
                        step={5}
                        className="py-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher infill = stronger but heavier and more expensive
                      </p>
                    </div>

                    {/* Infill Type */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Infill Pattern</Label>
                      <Select value={infillType} onValueChange={setInfillType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid (Fast)</SelectItem>
                          <SelectItem value="honeycomb">Honeycomb (Balanced)</SelectItem>
                          <SelectItem value="gyroid">Gyroid (Strong)</SelectItem>
                          <SelectItem value="triangular">Triangular</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Grid is fastest, gyroid is strongest
                      </p>
                    </div>

                    {/* Supports */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="mobile-supports" className="text-sm font-semibold">
                            Generate Supports
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">For overhangs above 45°</p>
                        </div>
                        <Switch id="mobile-supports" checked={needsSupports} onCheckedChange={setNeedsSupports} />
                      </div>
                    </div>

                    {/* Bed Adhesion */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Bed Adhesion</Label>
                      <Select value={bedAdhesion} onValueChange={setBedAdhesion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="skirt">Skirt (Light)</SelectItem>
                          <SelectItem value="brim">Brim (Recommended)</SelectItem>
                          <SelectItem value="raft">Raft (Maximum Adhesion)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Brim is recommended for most prints
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {/* Cost Estimate & Checkout */}
            {costEstimate && (
              <Card className="p-4 bg-primary/5 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-base">Estimated Cost</h3>
                </div>

                {/* Maker Details */}
                <div className="mb-3 p-3 bg-background rounded-lg border border-border/50">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{costEstimate.maker.makerName}</p>
                        {costEstimate.maker.verified && (
                          <i className="fa fa-certificate text-xs text-primary" title="Verified maker"></i>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <i className="fa fa-star text-yellow-500"></i>
                          {costEstimate.maker.rating.toFixed(1)}
                        </span>
                        <span>•</span>
                        <span>{costEstimate.maker.location}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {costEstimate.maker.totalPrints} successful prints
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Material ({printAnalysis.filamentGrams}g)</span>
                    <span>₹{costEstimate.material.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Labor ({printAnalysis.printTimeHours.toFixed(1)}h)
                    </span>
                    <span>₹{costEstimate.labor.toFixed(2)}</span>
                  </div>
                  {costEstimate.complexity > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Complexity</span>
                      <span>₹{costEstimate.complexity.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-xl text-primary">₹{costEstimate.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Proceed to Checkout
                </Button>
              </Card>
            )}
          </div>
        </div>
    </div>
  );
};

export default PrintStudio;
