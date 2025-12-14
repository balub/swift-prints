import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  User,
  Mail,
  Users,
  AlertCircle,
} from "lucide-react";
import { createOrder, type UploadResponse, type EstimateResponse, type Printer, type Filament } from "@/lib/api";

const OrderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const upload = location.state?.upload as UploadResponse | undefined;
  const printerId = location.state?.printerId as string | undefined;
  const filamentId = location.state?.filamentId as string | undefined;
  const estimate = location.state?.estimate as EstimateResponse | undefined;
  const printer = location.state?.printer as Printer | undefined;
  const filament = location.state?.filament as Filament | undefined;

  const [teamNumber, setTeamNumber] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder({
        uploadId: upload!.uploadId,
        printerId: printerId!,
        filamentId: filamentId!,
        teamNumber,
        participantName,
        participantEmail,
      }),
    onSuccess: (order) => {
      navigate(`/orders/${order.id}`, { state: { newOrder: true } });
    },
  });

  if (!upload || !printerId || !filamentId || !estimate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-text-primary mb-4">Missing Order Data</h1>
          <p className="text-text-muted mb-6">Please go through the full order flow.</p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const isFormValid = teamNumber.trim() && participantName.trim() && participantEmail.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-light text-text-primary">Place Order</h1>
        </div>

        <div className="grid gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-text-primary mb-3">Print Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">File:</span>
                      <span className="font-medium">{upload.filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Filament:</span>
                      <span className="font-medium">{estimate.filamentUsedGrams.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Print Time:</span>
                      <span className="font-medium">{estimate.printTimeHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-3">Printer & Material</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Printer:</span>
                      <span className="font-medium">{printer?.name || estimate.printerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Material:</span>
                      <span className="font-medium">{filament?.name || estimate.filamentName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Material Cost</span>
                  <span>₹{estimate.costBreakdown.material.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Machine Time</span>
                  <span>₹{estimate.costBreakdown.machineTime.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="text-primary text-lg">
                      ₹{estimate.costBreakdown.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamNumber" className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  Team Number
                </Label>
                <Input
                  id="teamNumber"
                  placeholder="e.g., Team-42"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  Your Name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            {orderMutation.isError && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                Failed to place order. Please try again.
              </div>
            )}
            <p className="text-sm text-text-muted mb-4">
              By placing this order, you confirm the details above are correct.
            </p>
            <Button
              size="lg"
              onClick={() => orderMutation.mutate()}
              disabled={!isFormValid || orderMutation.isPending}
              className="min-w-[200px]"
            >
              {orderMutation.isPending ? (
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
      </div>
    </div>
  );
};

export default OrderPage;

