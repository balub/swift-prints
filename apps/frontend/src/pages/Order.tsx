import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PaymentProcessor } from "@/components/PaymentProcessor";
import { useCreateOrder } from "@/hooks/api/useOrders";
import { useCalculatePricing } from "@/hooks/api/usePricing";
import { useCreatePaymentIntent } from "@/hooks/api/usePayments";
import { OrderCreate, PrintSettings } from "@/types/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Package,
  Clock,
  Printer,
  CreditCard,
} from "lucide-react";

const Order = () => {
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { maker, analysis, file, pricing } = location.state || {};

  const createOrder = useCreateOrder();
  const calculatePricing = useCalculatePricing();
  const createPaymentIntent = useCreatePaymentIntent();

  if (!maker || !analysis || !file) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-text-primary mb-4">
            Missing Order Data
          </h1>
          <p className="text-text-muted mb-6">
            Please select a maker and upload a file first.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }

    try {
      // Create default print settings based on analysis
      const settings: PrintSettings = {
        layer_height: 0.2,
        infill_density: 20,
        infill_pattern: "grid",
        supports: analysis.supports_required || false,
        bed_adhesion: "skirt",
        material_type: "PLA",
        nozzle_temperature: 210,
        bed_temperature: 60,
      };

      const orderData: OrderCreate = {
        file_id: file.id,
        analysis_id: analysis.id,
        maker_id: maker.id,
        settings,
        delivery_address: deliveryAddress.trim(),
        special_instructions: orderNotes.trim() || undefined,
      };

      const order = await createOrder.mutateAsync(orderData);
      setCreatedOrder(order);

      // Show payment dialog for immediate payment
      if (pricing && pricing.total > 0) {
        setShowPaymentDialog(true);
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      // Error handling is done in the mutation
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentCompleted(true);
    setShowPaymentDialog(false);
    toast.success("Payment completed successfully!");
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  if (createdOrder) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-light text-text-primary mb-4">
            Order Confirmed!
          </h1>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Your print request has been sent to {maker.name}. They'll contact
            you within 24 hours to confirm details.
          </p>

          <Card className="mb-8 text-left">
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Package className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">
                    Order ID: #{createdOrder.id.slice(-8)}
                  </p>
                  <p className="text-sm text-text-muted">
                    Save this for tracking your order
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CreditCard className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">
                    Total: ${createdOrder.pricing?.total?.toFixed(2) || "TBD"}
                  </p>
                  <p className="text-sm text-text-muted">
                    Payment will be processed when printing begins
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MessageCircle className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Next Steps</p>
                  <p className="text-sm text-text-muted">
                    {maker.name} will review your order and contact you to
                    confirm details
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/")}>Place Another Order</Button>
            <Button variant="outline" onClick={() => navigate("/orders")}>
              View My Orders
            </Button>
            {!paymentCompleted && pricing && pricing.total > 0 && (
              <Button onClick={() => setShowPaymentDialog(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Complete Payment
              </Button>
            )}
          </div>
        </div>

        {/* Payment Dialog */}
        {createdOrder && pricing && (
          <PaymentProcessor
            orderId={createdOrder.id}
            pricing={pricing}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            isOpen={showPaymentDialog}
            onClose={() => setShowPaymentDialog(false)}
          />
        )}
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Upload File", href: "/" },
    { label: "Choose Maker", href: "/makers" },
    { label: "Confirm Order", current: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />

        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/makers")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Makers
          </Button>
          <h1 className="text-3xl font-light text-text-primary">
            Confirm Order
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-text-primary mb-3">
                    Print Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">File:</span>
                      <span>{file.original_filename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Material:</span>
                      <span>{analysis.filament_grams}g PLA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Print Time:</span>
                      <span>{analysis.print_time_hours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Volume:</span>
                      <span>{(analysis.volume_mm3 / 1000).toFixed(1)}cm³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Supports:</span>
                      <span>
                        {analysis.supports_required ? "Required" : "Not needed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary mb-3">
                    Maker Details
                  </h4>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Printer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{maker.name}</p>
                      <p className="text-sm text-text-muted">
                        {maker.location_address || "Location not specified"}
                      </p>
                      <div className="flex items-center mt-1 text-sm">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">
                          {maker.rating.toFixed(1)} ({maker.total_prints}{" "}
                          prints)
                        </span>
                      </div>
                      {maker.verified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-1">
                          Verified
                        </span>
                      )}
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
              {pricing ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Material Cost</span>
                    <span>${pricing.material_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Labor Cost</span>
                    <span>${pricing.labor_cost.toFixed(2)}</span>
                  </div>
                  {pricing.complexity_premium > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">
                        Complexity Premium
                      </span>
                      <span>${pricing.complexity_premium.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Platform Fee</span>
                    <span>${pricing.platform_fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-primary">
                        ${pricing.total.toFixed(2)} {pricing.currency}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <LoadingSpinner />
                  <p className="text-sm text-text-muted mt-2">
                    Calculating pricing...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Address *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your delivery address..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                required
              />
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special requirements or notes for the maker..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <div className="bg-neutral-50 rounded-lg p-6 text-center">
            <p className="text-sm text-text-muted mb-4">
              By confirming this order, you agree to our terms of service. The
              maker will contact you within 24 hours to finalize details.
            </p>
            <Button
              size="lg"
              onClick={handleConfirmOrder}
              disabled={createOrder.isPending || !deliveryAddress.trim()}
              className="min-w-[200px]"
            >
              {createOrder.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Order;
