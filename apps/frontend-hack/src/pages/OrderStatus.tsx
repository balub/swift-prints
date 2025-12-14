import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Printer,
  AlertCircle,
  Loader2,
  PartyPopper,
  XCircle,
} from "lucide-react";
import { getOrder, type OrderStatus as OrderStatusType } from "@/lib/api";

const statusConfig: Record<
  OrderStatusType,
  { label: string; icon: typeof Package; color: string; bgColor: string }
> = {
  PLACED: {
    label: "Order Placed",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  PRINTING: {
    label: "Printing",
    icon: Printer,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  READY: {
    label: "Ready for Pickup",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  COMPLETED: {
    label: "Completed",
    icon: PartyPopper,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

const OrderStatus = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewOrder = location.state?.newOrder;

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-text-primary mb-4">Order Not Found</h1>
          <p className="text-text-muted mb-6">
            We couldn't find an order with ID: {orderId}
          </p>
          <Button onClick={() => navigate("/orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Banner for new orders */}
        {isNewOrder && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Order Placed Successfully!</p>
              <p className="text-sm text-green-700">
                Your order has been submitted and is being processed.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/orders")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-light text-text-primary">Order Status</h1>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${status.bgColor} rounded-full flex items-center justify-center`}>
                  <StatusIcon className={`w-8 h-8 ${status.color}`} />
                </div>
                <div>
                  <Badge className={`${status.bgColor} ${status.color} border-0 mb-1`}>
                    {status.label}
                  </Badge>
                  <p className="text-sm text-text-muted">
                    Order ID: {order.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ₹{order.totalCost.toFixed(2)}
                </p>
                <p className="text-sm text-text-muted">Total Cost</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-neutral-200 rounded">
                <div
                  className="h-full bg-primary rounded transition-all duration-500"
                  style={{
                    width:
                      order.status === "PLACED"
                        ? "25%"
                        : order.status === "PRINTING"
                        ? "50%"
                        : order.status === "READY"
                        ? "75%"
                        : order.status === "COMPLETED"
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>
              <div className="flex justify-between relative z-10">
                {[
                  { status: "PLACED", label: "Placed" },
                  { status: "PRINTING", label: "Printing" },
                  { status: "READY", label: "Ready" },
                  { status: "COMPLETED", label: "Done" },
                ].map((step, index) => {
                  const isActive =
                    ["PLACED", "PRINTING", "READY", "COMPLETED"].indexOf(order.status) >= index;
                  return (
                    <div key={step.status} className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? "bg-primary text-white" : "bg-neutral-200 text-text-muted"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className={`text-xs mt-2 ${isActive ? "text-primary font-medium" : "text-text-muted"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Print Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Filament Used</span>
                <span className="font-medium">{order.filamentUsedGrams.toFixed(1)}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Print Time</span>
                <span className="font-medium">{order.printTimeHours.toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Material Cost</span>
                <span className="font-medium">₹{order.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Machine Time</span>
                <span className="font-medium">₹{order.machineTimeCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Team</span>
                <span className="font-medium">{order.teamNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Name</span>
                <span className="font-medium">{order.participantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Email</span>
                <span className="font-medium text-xs">{order.participantEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Ordered</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Package className="w-4 h-4 mr-2" />
            New Order
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;

