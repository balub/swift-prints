import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  MessageCircle,
  Search,
  Filter,
  X,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  CreditCard,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealTime } from "@/contexts/RealTimeContext";
import {
  useOrders,
  useCancelOrder,
  useRateOrder,
  useUpdateOrder,
} from "@/hooks/api/useOrders";
import {
  OrderResponse,
  OrderStatus,
  OrderSearchFilters,
  OrderCancellation,
  OrderRating,
  OrderUpdate,
  PaginatedResponse,
} from "@/types/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

const Orders = () => {
  const navigate = useNavigate();
  const { subscribeToOrder, unsubscribeFromOrder } = useRealTime();

  // State for filters and pagination
  const [filters, setFilters] = useState<OrderSearchFilters>({
    limit: 10,
    offset: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  // State for order actions
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [ratingOrder, setRatingOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");

  // Fetch orders using React Query
  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
  } = useOrders(filters);

  const orders = ordersResponse?.data || [];
  const totalPages = ordersResponse?.total_pages || 1;
  const totalOrders = ordersResponse?.total || 0;

  // Mutations
  const cancelOrder = useCancelOrder();
  const rateOrder = useRateOrder();
  const updateOrder = useUpdateOrder();

  // Subscribe to real-time updates for all orders
  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach((order: OrderResponse) => {
        subscribeToOrder(order.id);
      });

      // Cleanup subscriptions when component unmounts or orders change
      return () => {
        orders.forEach((order: OrderResponse) => {
          unsubscribeFromOrder(order.id);
        });
      };
    }
  }, [orders, subscribeToOrder, unsubscribeFromOrder]);

  // Update filters when search or status changes
  useEffect(() => {
    const newFilters: OrderSearchFilters = {
      limit: 10,
      offset: (currentPage - 1) * 10,
    };

    if (statusFilter !== "all") {
      newFilters.status = [statusFilter as OrderStatus];
    }

    setFilters(newFilters);
  }, [currentPage, statusFilter]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    // Note: Backend search would need to be implemented
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status as OrderStatus | "all");
    setCurrentPage(1);
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      const cancellation: OrderCancellation = {
        reason: cancellationReason.trim(),
        refund_requested: true,
      };

      await cancelOrder.mutateAsync({ orderId, cancellation });
      setCancellingOrder(null);
      setCancellationReason("");
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }
  };

  // Handle order rating
  const handleRateOrder = async (orderId: string) => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      const orderRating: OrderRating = {
        rating,
        review: review.trim() || undefined,
      };

      await rateOrder.mutateAsync({ orderId, rating: orderRating });
      setRatingOrder(null);
      setRating(0);
      setReview("");
    } catch (error) {
      console.error("Failed to rate order:", error);
    }
  };

  // Handle order editing
  const handleEditOrder = (order: OrderResponse) => {
    setEditingOrder(order.id);
    setEditDeliveryAddress(order.delivery_address);
    setEditSpecialInstructions(order.special_instructions || "");
  };

  const handleSaveOrderEdit = async (orderId: string) => {
    if (!editDeliveryAddress.trim()) {
      toast.error("Delivery address is required");
      return;
    }

    try {
      const update: OrderUpdate = {
        delivery_address: editDeliveryAddress.trim(),
        special_instructions: editSpecialInstructions.trim() || undefined,
      };

      await updateOrder.mutateAsync({ orderId, update });
      setEditingOrder(null);
      setEditDeliveryAddress("");
      setEditSpecialInstructions("");
    } catch (error) {
      console.error("Failed to update order:", error);
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className="w-5 h-5 text-blue-500" />;
      case OrderStatus.ASSIGNED:
        return <Package className="w-5 h-5 text-purple-500" />;
      case OrderStatus.IN_PROGRESS:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case OrderStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case OrderStatus.CANCELLED:
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-text-muted" />;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const variants = {
      [OrderStatus.PENDING]: "secondary",
      [OrderStatus.ASSIGNED]: "outline",
      [OrderStatus.IN_PROGRESS]: "default",
      [OrderStatus.COMPLETED]: "default",
      [OrderStatus.CANCELLED]: "destructive",
    } as const;

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

  const canCancelOrder = (status: OrderStatus) => {
    return status === OrderStatus.PENDING || status === OrderStatus.ASSIGNED;
  };

  const canRateOrder = (status: OrderStatus) => {
    return status === OrderStatus.COMPLETED;
  };

  const canEditOrder = (status: OrderStatus) => {
    return status === OrderStatus.PENDING || status === OrderStatus.ASSIGNED;
  };

  const getStatusText = (status: OrderStatus) => {
    const statusTexts = {
      [OrderStatus.PENDING]: "Waiting for maker assignment",
      [OrderStatus.ASSIGNED]: "Assigned to maker",
      [OrderStatus.IN_PROGRESS]: "Being printed",
      [OrderStatus.COMPLETED]: "Completed",
      [OrderStatus.CANCELLED]: "Cancelled",
    };
    return statusTexts[status];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-light text-text-primary">My Orders</h1>
          </div>
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-light text-text-primary">My Orders</h1>
          </div>
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-medium text-text-primary mb-2">
              Error Loading Orders
            </h2>
            <p className="text-text-muted mb-6">
              Unable to load your orders. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
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
              onClick={() => navigate("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-light text-text-primary">My Orders</h1>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={OrderStatus.ASSIGNED}>Assigned</SelectItem>
                  <SelectItem value={OrderStatus.IN_PROGRESS}>
                    In Progress
                  </SelectItem>
                  <SelectItem value={OrderStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h2 className="text-xl font-medium text-text-primary mb-2">
              No Orders Yet
            </h2>
            <p className="text-text-muted mb-6">
              Upload your first STL file to get started with 3D printing.
            </p>
            <Button onClick={() => navigate("/")}>Upload File</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: OrderResponse) => (
              <Card key={order.id} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="font-medium text-text-primary">
                          {order.file?.original_filename || "Unknown File"}
                        </h3>
                        <p className="text-sm text-text-muted">
                          Order {order.id.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-text-primary">
                        ${order.pricing?.total?.toFixed(2) || "TBD"}
                      </div>
                      <div className="text-sm text-text-muted">
                        {getStatusText(order.status)}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-text-muted">Maker:</span>
                      <span className="ml-2 font-medium">
                        {order.maker?.name || "Not assigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Order Date:</span>
                      <span className="ml-2">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {order.status === OrderStatus.IN_PROGRESS && (
                      <div>
                        <span className="text-text-muted">
                          Est. Completion:
                        </span>
                        <span className="ml-2">TBD</span>
                      </div>
                    )}
                    {order.status === OrderStatus.COMPLETED && (
                      <div>
                        <span className="text-text-muted">Completed:</span>
                        <span className="ml-2">
                          {new Date(order.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>

                    {order.maker && (
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Maker
                      </Button>
                    )}

                    {canEditOrder(order.status) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Edit Order</DialogTitle>
                            <DialogDescription>
                              Update your order details. Changes can only be
                              made before printing begins.
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
                              onClick={() => handleSaveOrderEdit(order.id)}
                              disabled={
                                updateOrder.isPending ||
                                !editDeliveryAddress.trim()
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancellingOrder(order.id)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
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
                            <AlertDialogCancel
                              onClick={() => {
                                setCancellingOrder(null);
                                setCancellationReason("");
                              }}
                            >
                              Keep Order
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={
                                cancelOrder.isPending ||
                                !cancellationReason.trim()
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRatingOrder(order.id)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate
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
                              onClick={() => handleRateOrder(order.id)}
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
                      <Button variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reorder
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => handlePageChange(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* Order summary */}
            {totalOrders > 0 && (
              <div className="mt-4 text-center text-sm text-text-muted">
                Showing {(currentPage - 1) * 10 + 1} to{" "}
                {Math.min(currentPage * 10, totalOrders)} of {totalOrders}{" "}
                orders
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
