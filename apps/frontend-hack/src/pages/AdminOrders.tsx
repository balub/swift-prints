import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  Package,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  useAdminOrders,
  useUpdateOrderStatus,
  type OrderStatus,
  type AdminOrderListItem,
} from "@/services";

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string }
> = {
  PLACED: { label: "Placed", color: "text-blue-600", bgColor: "bg-blue-100" },
  PRINTING: { label: "Printing", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  READY: { label: "Ready", color: "text-green-600", bgColor: "bg-green-100" },
  COMPLETED: { label: "Completed", color: "text-primary", bgColor: "bg-primary/10" },
  CANCELLED: { label: "Cancelled", color: "text-red-600", bgColor: "bg-red-100" },
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderListItem | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");

  const { data: orders, isLoading, refetch } = useAdminOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    teamNumber: teamFilter || undefined,
  });

  const updateStatusMutation = useUpdateOrderStatus();

  const handleUpdateStatus = () => {
    if (selectedOrder && newStatus) {
      updateStatusMutation.mutate(
        { orderId: selectedOrder.orderId, status: newStatus },
        {
          onSuccess: () => {
            setSelectedOrder(null);
            setNewStatus("");
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate("/admin")} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-light text-text-primary">Orders Management</h1>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-text-muted mb-2 block">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Status Filter
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as OrderStatus | "all")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PLACED">Placed</SelectItem>
                    <SelectItem value="PRINTING">Printing</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-text-muted mb-2 block">
                  <Search className="w-4 h-4 inline mr-1" />
                  Team Number
                </label>
                <Input
                  placeholder="Filter by team..."
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              return (
                <Card key={order.orderId} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                          <span className="text-sm text-text-muted">
                            {order.orderId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-text-muted">Team:</span>{" "}
                            <span className="font-medium">{order.teamNumber}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Name:</span>{" "}
                            <span className="font-medium">{order.participantName}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">File:</span>{" "}
                            <span className="font-medium truncate">{order.filename}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Total:</span>{" "}
                            <span className="font-bold text-primary">₹{order.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mt-2">
                          Ordered: {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.orderId}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setNewStatus(order.status);
                          }}
                        >
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Orders Found</h3>
              <p className="text-text-muted">
                {statusFilter !== "all" || teamFilter
                  ? "Try adjusting your filters"
                  : "Orders will appear here when customers place them"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Update Status Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="text-text-muted">Order ID:</span>{" "}
                      <span className="font-mono">{selectedOrder.orderId.slice(0, 8)}...</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Team:</span>{" "}
                      <span className="font-medium">{selectedOrder.teamNumber}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Current Status:</span>{" "}
                      <Badge className={`${statusConfig[selectedOrder.status].bgColor} ${statusConfig[selectedOrder.status].color} border-0`}>
                        {statusConfig[selectedOrder.status].label}
                      </Badge>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">New Status</label>
                    <Select value={newStatus} onValueChange={(val) => setNewStatus(val as OrderStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLACED">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            Placed
                          </div>
                        </SelectItem>
                        <SelectItem value="PRINTING">
                          <div className="flex items-center gap-2">
                            <Printer className="w-4 h-4 text-yellow-600" />
                            Printing
                          </div>
                        </SelectItem>
                        <SelectItem value="READY">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Ready for Pickup
                          </div>
                        </SelectItem>
                        <SelectItem value="COMPLETED">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="CANCELLED">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            Cancelled
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={!newStatus || updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminOrders;
