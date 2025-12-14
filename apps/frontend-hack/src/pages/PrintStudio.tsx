import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { STLViewer } from "@/components/STLViewer";
import {
  Upload,
  IndianRupee,
  Info,
  ShoppingCart,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
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
  getPrinters,
  getEstimate,
  getDownloadUrl,
  type UploadResponse,
  type Printer,
  type EstimateResponse,
} from "@/lib/api";

const PrintStudio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const upload = location.state?.upload as UploadResponse | undefined;

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>("");
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infillPercent, setInfillPercent] = useState(20);
  const [supports, setSupports] = useState<"none" | "auto" | "everywhere">("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  // Fetch printers
  const { data: printers, isLoading: loadingPrinters, error: printersError } = useQuery({
    queryKey: ["printers"],
    queryFn: getPrinters,
  });

  // Get download URL for STL preview
  useEffect(() => {
    if (upload?.uploadId) {
      getDownloadUrl(upload.uploadId)
        .then((data) => setStlUrl(data.url))
        .catch(console.error);
    }
  }, [upload?.uploadId]);

  // Get selected printer and filament
  const selectedPrinter = printers?.find((p) => p.id === selectedPrinterId);
  const selectedFilament = selectedPrinter?.filaments.find(
    (f) => f.id === selectedFilamentId
  );

  // Fetch estimate when all selections are made
  const estimateMutation = useMutation({
    mutationFn: () =>
      getEstimate({
        uploadId: upload!.uploadId,
        printerId: selectedPrinterId,
        filamentId: selectedFilamentId,
        layerHeight,
        infill: infillPercent,
        supports,
      }),
  });

  // Auto-fetch estimate when selections change
  useEffect(() => {
    if (upload && selectedPrinterId && selectedFilamentId) {
      estimateMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrinterId, selectedFilamentId, layerHeight, infillPercent, supports]);

  // Auto-select first printer and filament
  useEffect(() => {
    if (printers?.length && !selectedPrinterId) {
      const firstPrinter = printers[0];
      setSelectedPrinterId(firstPrinter.id);
      if (firstPrinter.filaments?.length) {
        setSelectedFilamentId(firstPrinter.filaments[0].id);
      }
    }
  }, [printers, selectedPrinterId]);

  // Update filament when printer changes
  useEffect(() => {
    if (selectedPrinter?.filaments?.length && !selectedPrinter.filaments.find(f => f.id === selectedFilamentId)) {
      setSelectedFilamentId(selectedPrinter.filaments[0].id);
    }
  }, [selectedPrinter, selectedFilamentId]);

  const handleProceed = () => {
    if (upload && selectedPrinterId && selectedFilamentId && estimateMutation.data) {
      navigate("/order", {
        state: {
          upload,
          printerId: selectedPrinterId,
          filamentId: selectedFilamentId,
          estimate: estimateMutation.data,
          printer: selectedPrinter,
          filament: selectedFilament,
        },
      });
    }
  };

  if (!upload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-text-primary mb-4">No Upload Found</h1>
          <p className="text-text-muted mb-6">Please upload an STL file first.</p>
          <Button onClick={() => navigate("/")}>
            <Upload className="w-4 h-4 mr-2" />
            Go to Upload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:grid lg:grid-cols-5 lg:min-h-[calc(100vh-64px)]">
        {/* LEFT PANEL - Controls */}
        <div className="col-span-2 border-r border-border overflow-y-auto">
          <div className="sticky top-0 bg-secondary/95 backdrop-blur-md border-b border-border z-10 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">Print Studio</h1>
                <p className="text-xs text-muted-foreground">Configure your print</p>
              </div>
              <Badge variant="outline" className="border-primary text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                Live API
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* File Info */}
            <Card className="p-4 bg-primary/5 border-primary/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{upload.filename}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {upload.baseEstimate.filamentGrams.toFixed(1)}g filament •{" "}
                    {upload.baseEstimate.printTimeHours.toFixed(1)}h estimated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {upload.boundingBox.x.toFixed(1)} x {upload.boundingBox.y.toFixed(1)} x{" "}
                    {upload.boundingBox.z.toFixed(1)} mm
                  </p>
                </div>
                {upload.needsSupports && (
                  <Badge variant="secondary" className="text-xs">
                    Needs Supports
                  </Badge>
                )}
              </div>
            </Card>

            {/* Printer Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Printer</Label>
              {loadingPrinters ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : printersError ? (
                <div className="text-sm text-destructive">Failed to load printers</div>
              ) : (
                <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers?.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.name} - ₹{printer.hourlyRate}/hr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Filament Selection */}
            {selectedPrinter && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Filament</Label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPrinter.filaments.map((filament) => (
                    <button
                      key={filament.id}
                      onClick={() => setSelectedFilamentId(filament.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedFilamentId === filament.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="font-semibold text-sm">{filament.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{filament.pricePerGram.toFixed(2)}/g
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Options */}
            <Card className="overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Advanced Settings</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {showAdvanced ? "▲" : "▼"}
                </span>
              </button>

              {showAdvanced && (
                <div className="p-4 border-t border-border space-y-4 bg-muted/20">
                  {/* Layer Height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Layer Height</Label>
                      <span className="text-primary font-mono text-sm">{layerHeight}mm</span>
                    </div>
                    <Select
                      value={layerHeight.toString()}
                      onValueChange={(val) => setLayerHeight(parseFloat(val))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.1">0.1mm (High Quality)</SelectItem>
                        <SelectItem value="0.15">0.15mm (Fine)</SelectItem>
                        <SelectItem value="0.2">0.2mm (Recommended)</SelectItem>
                        <SelectItem value="0.25">0.25mm (Standard)</SelectItem>
                        <SelectItem value="0.3">0.3mm (Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Infill */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Infill Density</Label>
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

                  {/* Supports */}
                  <div className="space-y-2">
                    <Label className="text-sm">Support Generation</Label>
                    <Select value={supports} onValueChange={(val) => setSupports(val as typeof supports)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="auto">Auto (Recommended)</SelectItem>
                        <SelectItem value="everywhere">Everywhere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </Card>

            {/* Cost Estimate */}
            {estimateMutation.data && (
              <Card className="p-5 bg-primary/5 border-primary/30">
                <div className="flex items-center gap-2 mb-4">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Cost Estimate</h3>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Material ({estimateMutation.data.filamentUsedGrams.toFixed(1)}g)
                    </span>
                    <span>₹{estimateMutation.data.costBreakdown.material.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Machine Time ({estimateMutation.data.printTimeHours.toFixed(1)}h)
                    </span>
                    <span>₹{estimateMutation.data.costBreakdown.machineTime.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                    <span className="font-semibold text-base">Total</span>
                    <span className="font-bold text-xl text-primary">
                      ₹{estimateMutation.data.costBreakdown.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleProceed}
                  disabled={!selectedPrinterId || !selectedFilamentId}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Proceed to Order
                </Button>
              </Card>
            )}

            {estimateMutation.isPending && (
              <Card className="p-5 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Calculating price...</span>
              </Card>
            )}

            {estimateMutation.isError && (
              <Card className="p-5 border-destructive/30 bg-destructive/5">
                <p className="text-sm text-destructive">
                  Failed to calculate estimate. Please try again.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - STL Viewer */}
        <div className="col-span-3 bg-muted/20 flex flex-col">
          <div className="border-b border-border px-6 py-4 bg-secondary/95 backdrop-blur-md shadow-sm">
            <h2 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📦</span>
              3D Preview
            </h2>
          </div>
          <div className="flex-1 p-6">
            <STLViewer url={stlUrl} file={null} className="w-full h-full min-h-[400px] rounded-2xl shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintStudio;

