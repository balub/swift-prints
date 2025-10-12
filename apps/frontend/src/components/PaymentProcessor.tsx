import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PricingBreakdown } from "@/types/api";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "bank_transfer";
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

interface PaymentProcessorProps {
  orderId: string;
  pricing: PricingBreakdown;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentProcessor = ({
  orderId,
  pricing,
  onPaymentSuccess,
  onPaymentError,
  isOpen,
  onClose,
}: PaymentProcessorProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: "card_1",
      type: "card",
      last4: "4242",
      brand: "visa",
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
    },
    {
      id: "card_2",
      type: "card",
      last4: "0005",
      brand: "mastercard",
      expiryMonth: 8,
      expiryYear: 2026,
    },
  ]);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // New card form state
  const [newCard, setNewCard] = useState({
    number: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    name: "",
    zipCode: "",
  });

  const handlePayment = async () => {
    if (!selectedPaymentMethod && !showNewCardForm) {
      toast.error("Please select a payment method");
      return;
    }

    if (showNewCardForm && !isNewCardValid()) {
      toast.error("Please fill in all card details");
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In a real implementation, this would call the payment API
      const paymentId = `payment_${Date.now()}`;

      setPaymentComplete(true);

      // Wait a moment to show success state
      setTimeout(() => {
        onPaymentSuccess(paymentId);
        onClose();
        setPaymentComplete(false);
        setProcessing(false);
      }, 1500);
    } catch (error) {
      setProcessing(false);
      onPaymentError("Payment failed. Please try again.");
    }
  };

  const isNewCardValid = () => {
    return (
      newCard.number.length >= 16 &&
      newCard.expiryMonth &&
      newCard.expiryYear &&
      newCard.cvc.length >= 3 &&
      newCard.name.trim() &&
      newCard.zipCode.trim()
    );
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setNewCard({ ...newCard, number: formatted });
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  if (paymentComplete) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Payment Successful!
            </h3>
            <p className="text-text-muted">
              Your payment has been processed successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Secure payment processing for order #{orderId.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                  <span className="text-text-muted">Complexity Premium</span>
                  <span>${pricing.complexity_premium.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Platform Fee</span>
                <span>${pricing.platform_fee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="text-primary">
                  ${pricing.total.toFixed(2)} {pricing.currency}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="space-y-4">
            <h3 className="font-medium">Payment Method</h3>

            {/* Existing Payment Methods */}
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setSelectedPaymentMethod(method.id);
                    setShowNewCardForm(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">
                        {getCardBrandIcon(method.brand || "")}
                      </span>
                      <div>
                        <p className="font-medium">
                          {method.brand?.toUpperCase()} •••• {method.last4}
                        </p>
                        <p className="text-sm text-text-muted">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Card Option */}
            <div
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                showNewCardForm
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => {
                setShowNewCardForm(true);
                setSelectedPaymentMethod("");
              }}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-text-muted" />
                <span className="font-medium">Add new card</span>
              </div>
            </div>

            {/* New Card Form */}
            {showNewCardForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        placeholder="1234 5678 9012 3456"
                        value={newCard.number}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry-month">Expiry Month</Label>
                      <Select
                        value={newCard.expiryMonth}
                        onValueChange={(value) =>
                          setNewCard({ ...newCard, expiryMonth: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem
                              key={i + 1}
                              value={String(i + 1).padStart(2, "0")}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expiry-year">Expiry Year</Label>
                      <Select
                        value={newCard.expiryYear}
                        onValueChange={(value) =>
                          setNewCard({ ...newCard, expiryYear: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem
                              key={i}
                              value={String(new Date().getFullYear() + i)}
                            >
                              {new Date().getFullYear() + i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={newCard.cvc}
                        onChange={(e) =>
                          setNewCard({
                            ...newCard,
                            cvc: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        placeholder="12345"
                        value={newCard.zipCode}
                        onChange={(e) =>
                          setNewCard({ ...newCard, zipCode: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="cardholder-name">Cardholder Name</Label>
                      <Input
                        id="cardholder-name"
                        placeholder="John Doe"
                        value={newCard.name}
                        onChange={(e) =>
                          setNewCard({ ...newCard, name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-center space-x-2 text-sm text-text-muted">
            <Lock className="w-4 h-4" />
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={
              processing || (!selectedPaymentMethod && !showNewCardForm)
            }
            className="min-w-[120px]"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Pay ${pricing.total.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProcessor;
