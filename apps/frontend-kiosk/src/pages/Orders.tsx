import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, Search, Eye, AlertCircle } from "lucide-react";

const Orders = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");

  const handleLookup = () => {
    if (orderId.trim()) {
      navigate(`/orders/${orderId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-light text-text-primary">My Orders</h1>
        </div>

        {/* Order Lookup */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Track Your Order
              </h2>
              <p className="text-text-muted">
                Enter your order ID to check the status of your print
              </p>
            </div>

            <div className="flex gap-3">
              <Input
                placeholder="Enter Order ID (e.g., abc123-def456...)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="flex-1"
              />
              <Button onClick={handleLookup} disabled={!orderId.trim()}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="bg-neutral-50 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                How to find your Order ID
              </h3>
              <ul className="text-sm text-text-muted space-y-2">
                <li>• Check the confirmation page after placing your order</li>
                <li>• Look in your email for the order confirmation</li>
                <li>• Order IDs are in the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <p className="text-text-muted mb-4">Don't have an order yet?</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <Package className="w-4 h-4 mr-2" />
            Start a New Print
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Orders;

