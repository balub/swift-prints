import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  MessageCircle,
  X,
  Edit,
  Star,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  RefreshCw,
  Download,
  Printer,
  User,
} from "lucide-react";
import {
  useOrder,
  useCancelOrder,
  useRateOrder,
  useUpdateOrder,
} from "@/hooks/api/useOrders";
import { useRealTime } from "@/contexts/RealTimeContext";
import {
  OrderStatus,
  OrderCancellation,
  OrderRating,
  OrderUpdate,
} from "@/types/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { subscribeToOrder, unsubscribeFromOrder } = useRealTime();

  // State for order actions
  const [cancellationReason, setCancellationReason] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");

  // Fetch order data
  const { data: order, isLoading, error } = useOrder(orderId!);

  // Mutations
  const cancelOrder = useCancelOrder();
  const rateOrder = useRateOrder();
  const updateOrder = useUpdateOrder();

  // Subscribe to real-time updates
  useEffect(() => {
    if (orderId) {
      subscribeToOrder(orderId);
      return () => unsubscribeFromOrder(orderId);
    }
  }, [orderId, subscribeToOrder, unsubscribeFromOrder]);

  // Initialize edit form when order loads
  useEffect(() => {
    if (order) {
      setEditDeliveryAddress(order.delivery_address);
      setEditSpecialInstructions(order.special_instructions || "");
    }
  }, [order]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className="w-6 h-6 text-blue-500" />;
      case OrderStatus.ASSIGNED:
        return <Package className="w-6 h-6 text-purple-500" />;
      case OrderStatus.IN_PROGRESS:
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case OrderStatus.CANCELLED:
        return <X className="w-6 h-6 text-red-500" />;
      default:
        return <Package className="w-6 h-6 text-text-muted" />;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const colors = {
      [OrderStatus.PENDING]: "bg-blue-100 text-blue-800",
      [OrderStatus.ASSIGNED]: "bg-purple-100 text-purple-800",
      [OrderStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800",
      [OrderStatus.COMPLETED]: "bg-green-100 text-green-800",
      [OrderStatus.CANCELLED]: "bg-red-100 text-red-800",
    };

    const labels = {
      [OrderStatus.PENDING]: "Pending",
      [OrderStatus.ASSIGNED]: "Assigned",
      [OrderStatus.IN_PROGRESS]: "In Progress",
      [OrderStatus.COMPLETED]: "Completed",
      [OrderStatus.CANCELLED]: "Cancelled",
    };

    return <Badge className={colors[status]}>{labels[status]}</Badge>;
  };

  const getStatusDescription = (status: OrderStatus) => {
    const descriptions = {
      [OrderStatus.PENDING]: "Your order is waiting to be assigned to a maker.",
      [OrderStatus.ASSIGNED]:
        "Your order has been assigned to a maker and is being reviewed.",
      [OrderStatus.IN_PROGRESS]: "Your order is currently being printed.",
      [OrderStatus.COMPLETED]:
        "Your order has been completed and is ready for pickup/delivery.",
      [OrderStatus.CANCELLED]: "This order has been cancelled.",
    };
    return descriptions[status];
  };

  const canCancelOrder = (status: OrderStatus) => {
    return status === OrderStatus.PENDING || status === OrderStatus.ASSIGNED;
  };

  const canEditOrder = (status: OrderStatus) => {
    return status === OrderStatus.PENDING || status === OrderStatus.ASSIGNED;
  };

  const canRateOrder = (status: OrderStatus) => {
    return status === OrderStatus.COMPLETED;
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      const cancellation: OrderCancellation = {
        reason: cancellationReason.trim(),
        refund_requested: true,
      };

      await cancelOrder.mutateAsync({ orderId: orderId!, cancellation });
      setCancellationReason("");
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }
  };

  const handleRateOrder = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      const orderRating: OrderRating = {
        rating,
        review: review.trim() || undefined,
      };

      await rateOrder.mutateAsync({ orderId: orderId!, rating: orderRating });
      setRating(0);
      setReview("");
    } catch (error) {
      console.error("Failed to rate order:", error);
    }
  };

  const handleUpdateOrder = async () => {
    if (!editDeliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    try {
      const update: OrderUpdate = {
        delivery_address: editDeliveryAddress.trim(),
        special_instructions: editSpecialInstructions.trim() || undefined,
      };

      await updateOrder.mutateAsync({ orderId: orderId!, update });
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/orders")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <h1 className="text-3xl font-light text-text-primary">
              Order Details
            </h1>
          </div>
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/orders")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <h1 className="text-3xl font-light text-text-primary">
              Order Details
            </h1>
          </div>
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-medium text-text-primary mb-2">
              Order Not Found
            </h2>
            <p className="text-text-muted mb-6">
              The order you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => navigate("/orders")}>Back to Orders</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/orders")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-light text-text-primary">
                Order #{order.id.slice(-8)}
              </h1>
              <p className="text-text-muted">
                {order.file?.original_filename || "Unknown File"}
              </p>
            </div>
          </div>
          <div className="text-right">{getStatusBadge(order.status)}</div>
        </div>

        <div className="grid gap-6">
          {/* Order Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {getStatusIcon(order.status)}
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-text-primary">
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1).replace("_", " ")}
                  </h3>
                  <p className="text-text-muted">
                    {getStatusDescription(order.status)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-medium text-text-primary">
                    ${order.pricing?.total?.toFixed(2) || "TBD"}
                  </div>
                  <div className="text-sm text-text-muted">
                    {order.pricing?.currency || "USD"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* File Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  File Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">Filename:</span>
                  <span className="font-medium">
                    {order.file?.original_filename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">File Size:</span>
                  <span>
                    {((order.file?.file_size || 0) / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Material:</span>
                  <span>
                    {order.analysis?.filament_grams}g{" "}
                    {order.settings?.material_type || "PLA"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Print Time:</span>
                  <span>{order.analysis?.print_time_hours?.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Volume:</span>
                  <span>
                    {((order.analysis?.volume_mm3 || 0) / 1000).toFixed(1)}cm³
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Supports:</span>
                  <span>
                    {order.analysis?.supports_required
                      ? "Required"
                      : "Not needed"}
                  </span>
                </div>
                {order.file && (
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Maker Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Maker Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.maker ? (
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Printer className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{order.maker.name}</p>
                        <p className="text-sm text-text-muted">
                          {order.maker.location_address ||
                            "Location not specified"}
                        </p>
                        <div className="flex items-center mt-1 text-sm">
                          <span className="text-yellow-500">★</span>
                          <span className="ml-1">
                            {order.maker.rating?.toFixed(1)} (
                            {order.maker.total_prints} prints)
                          </span>
                        </div>
                        {order.maker.verified && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-1">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Maker
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-text-muted">No maker assigned yet</p>
                    <p className="text-sm text-text-muted mt-1">
                      Your order will be assigned to a maker soon
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center text-sm text-text-muted mb-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    Order Date
                  </div>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <div className="flex items-center text-sm text-text-muted mb-1">
                    <Clock className="w-4 h-4 mr-2" />
                    Last Updated
                  </div>
                  <p className="font-medium">
                    {new Date(order.updated_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center text-sm text-text-muted mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Delivery Address
                </div>
                <p className="font-medium whitespace-pre-line">
                  {order.delivery_address}
                </p>
              </div>

              {order.special_instructions && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center text-sm text-text-muted mb-2">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Special Instructions
                    </div>
                    <p className="font-medium whitespace-pre-line">
                      {order.special_instructions}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          {order.pricing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Material Cost</span>
                    <span>${order.pricing.material_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Labor Cost</span>
                    <span>${order.pricing.labor_cost.toFixed(2)}</span>
                  </div>
                  {order.pricing.complexity_premium > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">
                        Complexity Premium
                      </span>
                      <span>
                        ${order.pricing.complexity_premium.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Platform Fee</span>
                    <span>${order.pricing.platform_fee.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      ${order.pricing.total.toFixed(2)} {order.pricing.currency}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {canEditOrder(order.status) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit Order</DialogTitle>
                        <DialogDescription>
                          Update your order details. Changes can only be made
                          before printing begins.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="delivery-address">
                            Delivery Address *
                          </Label>
                          <Textarea
                            id="delivery-address"
                            value={editDeliveryAddress}
                            onChange={(e) =>
                              setEditDeliveryAddress(e.target.value)
                            }
                            rows={3}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="special-instructions">
                            Special Instructions
                          </Label>
                          <Textarea
                            id="special-instructions"
                            value={editSpecialInstructions}
                            onChange={(e) =>
                              setEditSpecialInstructions(e.target.value)
                            }
                            rows={3}
                            placeholder="Any special requirements..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          onClick={handleUpdateOrder}
                          disabled={
                            updateOrder.isPending || !editDeliveryAddress.trim()
                          }
                        >
                          {updateOrder.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {canCancelOrder(order.status) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <X className="w-4 h-4 mr-2" />
                        Cancel Order
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this order? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <Label htmlFor="cancellation-reason">
                          Reason for cancellation *
                        </Label>
                        <Textarea
                          id="cancellation-reason"
                          value={cancellationReason}
                          onChange={(e) =>
                            setCancellationReason(e.target.value)
                          }
                          placeholder="Please provide a reason for cancellation..."
                          rows={3}
                          className="mt-2"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelOrder}
                          disabled={
                            cancelOrder.isPending || !cancellationReason.trim()
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {cancelOrder.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            "Cancel Order"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {canRateOrder(order.status) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Star className="w-4 h-4 mr-2" />
                        Rate Experience
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Rate Your Experience</DialogTitle>
                        <DialogDescription>
                          How was your experience with {order.maker?.name}?
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Rating *</Label>
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`text-2xl ${
                                  star <= rating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                } hover:text-yellow-400 transition-colors`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="review">Review (Optional)</Label>
                          <Textarea
                            id="review"
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            rows={3}
                            placeholder="Share your experience..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          onClick={handleRateOrder}
                          disabled={rateOrder.isPending || rating === 0}
                        >
                          {rateOrder.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Rating"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {order.status === OrderStatus.COMPLETED && (
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reorder
                  </Button>
                )}

                <Button>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
