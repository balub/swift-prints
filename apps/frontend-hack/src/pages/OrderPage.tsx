import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  User,
  Mail,
  Users,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Home,
  Printer,
  IndianRupee,
} from "lucide-react";
import {
  useCreateOrder,
  usePrinters,
  useEstimate,
  getDownloadUrl,
  type UploadResponse,
  type CreateOrderResponse,
} from "@/services";
import { STLViewer } from "@/components/STLViewer";

// Validation schema
const orderFormSchema = z.object({
  teamNumber: z
    .string()
    .min(1, "Team number is required")
    .min(2, "Team number must be at least 2 characters")
    .max(50, "Team number must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\-_\s]+$/,
      "Team number can only contain letters, numbers, hyphens, underscores, and spaces"
    ),
  participantName: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
    ),
  participantEmail: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

const OrderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [completedOrder, setCompletedOrder] = useState<CreateOrderResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>("");
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  const upload = location.state?.upload as UploadResponse | undefined;

  // Get download URL for STL preview
  useEffect(() => {
    if (upload?.uploadId) {
      getDownloadUrl(upload.uploadId)
        .then((data) => setStlUrl(data.url))
        .catch(console.error);
    }
  }, [upload?.uploadId]);

  // Fetch printers
  const { data: printers, isLoading: loadingPrinters } = usePrinters();
  const estimateMutation = useEstimate();
  const createOrderMutation = useCreateOrder();

  // Get selected printer and filament
  const selectedPrinter = printers?.find((p) => p.id === selectedPrinterId);
  const selectedFilament = selectedPrinter?.filaments.find(
    (f) => f.id === selectedFilamentId
  );

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

  // Auto-fetch estimate when selections change
  useEffect(() => {
    if (upload && selectedPrinterId && selectedFilamentId) {
      estimateMutation.mutate({
        uploadId: upload.uploadId,
        printerId: selectedPrinterId,
        filamentId: selectedFilamentId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrinterId, selectedFilamentId, upload?.uploadId]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    mode: "onChange",
    defaultValues: {
      teamNumber: "",
      participantName: "",
      participantEmail: "",
    },
  });

  const onSubmit = (data: OrderFormData) => {
    if (!upload || !selectedPrinterId || !selectedFilamentId) return;
    
    createOrderMutation.mutate(
      {
        uploadId: upload.uploadId,
        printerId: selectedPrinterId,
        filamentId: selectedFilamentId,
        teamNumber: data.teamNumber,
        participantName: data.participantName,
        participantEmail: data.participantEmail,
      },
      {
        onSuccess: (order) => {
          setCompletedOrder(order);
        },
      }
    );
  };

  const copyOrderId = () => {
    if (completedOrder) {
      navigator.clipboard.writeText(completedOrder.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Missing upload data
  if (!upload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-text-primary mb-4">
            No File Uploaded
          </h1>
          <p className="text-text-muted mb-6">
            Please upload an STL file first.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Upload
          </Button>
        </div>
      </div>
    );
  }

  // Success state - show after order is placed
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-8 pb-6 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              {/* Success Message */}
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                Order Placed Successfully!
              </h1>
              <p className="text-green-700 mb-6">
                Your print order has been submitted and is being processed.
              </p>

              {/* Order ID */}
              <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
                <p className="text-sm text-text-muted mb-2">Your Order ID</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono bg-neutral-100 px-3 py-2 rounded text-text-primary break-all">
                    {completedOrder.orderId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyOrderId}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Save this ID to track your order
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg p-4 mb-6 border border-green-200 text-left">
                <h3 className="font-semibold text-sm mb-3 text-text-primary">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Cost:</span>
                    <span className="font-bold text-primary">
                      ₹{completedOrder.totalCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Status:</span>
                    <span className="font-medium text-blue-600">
                      {completedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate(`/orders/${completedOrder.orderId}`)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Track Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canSubmit = isValid && selectedPrinterId && selectedFilamentId && estimateMutation.data;

  // Order form
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-64px)]">
        {/* LEFT PANEL - Form */}
        <div className="border-r border-border overflow-y-auto">
          <div className="p-6 lg:p-8">
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={() => navigate("/")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-light text-text-primary">Place Order</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                {/* File Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2 text-primary" />
                      File Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">File:</span>
                        <span className="font-medium">{upload.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Volume:</span>
                        <span className="font-medium">
                          {(upload.volumeMm3 / 1000).toFixed(1)} cm³
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Dimensions:</span>
                        <span className="font-medium">
                          {upload.boundingBox.x.toFixed(1)} × {upload.boundingBox.y.toFixed(1)} × {upload.boundingBox.z.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Est. Filament:</span>
                        <span className="font-medium">
                          {upload.baseEstimate.filamentGrams.toFixed(1)}g
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Printer & Filament Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Printer className="w-5 h-5 mr-2 text-primary" />
                  Select Printer & Material
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Printer Selection */}
                <div className="space-y-2">
                  <Label>Printer</Label>
                  {loadingPrinters ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
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
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedPrinter.filaments.map((filament) => (
                        <button
                          key={filament.id}
                          type="button"
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
              </CardContent>
            </Card>

            {/* Cost Estimate */}
            {estimateMutation.data && (
              <Card className="bg-primary/5 border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <IndianRupee className="w-5 h-5 mr-2 text-primary" />
                    Cost Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">
                        Material ({estimateMutation.data.filamentUsedGrams.toFixed(1)}g)
                      </span>
                      <span>₹{estimateMutation.data.costBreakdown.material.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">
                        Machine Time ({estimateMutation.data.printTimeHours.toFixed(1)}h)
                      </span>
                      <span>₹{estimateMutation.data.costBreakdown.machineTime.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span className="text-primary text-xl font-bold">
                          ₹{estimateMutation.data.costBreakdown.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {estimateMutation.isPending && (
              <Card className="p-5 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Calculating price...</span>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Team Number */}
                <div className="space-y-2">
                  <Label htmlFor="teamNumber" className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    Team Number <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="teamNumber"
                    placeholder="e.g., Team-42"
                    {...register("teamNumber")}
                    className={errors.teamNumber ? "border-destructive" : ""}
                  />
                  {errors.teamNumber && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.teamNumber.message}
                    </p>
                  )}
                </div>

                {/* Participant Name */}
                <div className="space-y-2">
                  <Label htmlFor="participantName" className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    Your Name <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="participantName"
                    placeholder="John Doe"
                    {...register("participantName")}
                    className={errors.participantName ? "border-destructive" : ""}
                  />
                  {errors.participantName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.participantName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="participantEmail" className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    Email Address <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    id="participantEmail"
                    type="email"
                    placeholder="john@example.com"
                    {...register("participantEmail")}
                    className={errors.participantEmail ? "border-destructive" : ""}
                  />
                  {errors.participantEmail && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.participantEmail.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="bg-neutral-50 rounded-lg p-6 text-center">
              {createOrderMutation.isError && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  Failed to place order. Please try again.
                </div>
              )}
              <p className="text-sm text-text-muted mb-4">
                By placing this order, you confirm the details above are correct.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={!canSubmit || createOrderMutation.isPending}
                className="min-w-[200px]"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Place Order
                  </>
                )}
              </Button>
            </div>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL - 3D Preview */}
        <div className="hidden lg:flex lg:flex-col bg-muted/20">
          <div className="border-b border-border px-6 py-4 bg-secondary/95 backdrop-blur-md shadow-sm">
            <h2 className="text-lg font-semibold flex items-center">
              <span className="mr-2">📦</span>
              3D Preview
            </h2>
          </div>
          <div className="flex-1 p-6">
            <STLViewer 
              url={stlUrl} 
              file={null} 
              className="w-full h-full min-h-[500px] rounded-2xl shadow-lg" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPage;
