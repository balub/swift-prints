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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Package,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  useAdminOrders,
  useUpdateOrderStatus,
  useAdminOrder,
  getDownloadUrl,
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
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useAdminOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
    teamNumber: teamFilter || undefined,
  });

  const updateStatusMutation = useUpdateOrderStatus();

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    setCopiedOrderId(orderId);
    toast.success("Order ID copied to clipboard!");
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleDownloadFile = async (orderId: string) => {
    setDownloadingOrderId(orderId);
    try {
      // Get full order details to access uploadId
      const { getAdminOrder } = await import("@/services");
      const orderDetails = await getAdminOrder(orderId);
      
      if (!orderDetails.uploadId) {
        toast.error("File not available for download");
        setDownloadingOrderId(null);
        return;
      }
      
      const downloadData = await getDownloadUrl(orderDetails.uploadId);
      
      if (!downloadData.url) {
        toast.error("Download URL not available");
        setDownloadingOrderId(null);
        return;
      }
      
      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = downloadData.url;
      link.download = orderDetails.filename || "file.stl";
      link.target = "_blank"; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${orderDetails.filename || "file"}...`);
    } catch (error) {
      console.error("Download error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download file";
      toast.error(errorMessage);
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    updateStatusMutation.mutate(
      { orderId, status: newStatus },
      {
        onSuccess: () => {
          toast.success("Order status updated");
          setUpdatingOrderId(null);
        },
        onError: () => {
          toast.error("Failed to update status");
          setUpdatingOrderId(null);
        },
      }
    );
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
        <TooltipProvider>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status];
                const isUpdating = updatingOrderId === order.orderId;
                return (
                  <Card key={order.orderId} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={`${status.bgColor} ${status.color} border-0`}>
                              {status.label}
                            </Badge>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-mono text-text-muted">
                                {order.orderId.slice(0, 8)}...
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-primary/10"
                                    onClick={() => handleCopyOrderId(order.orderId)}
                                  >
                                    {copiedOrderId === order.orderId ? (
                                      <Check className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-text-muted hover:text-primary" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {copiedOrderId === order.orderId ? "Copied!" : "Copy Order ID"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
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

                        <div className="flex gap-2 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(order.orderId)}
                            disabled={downloadingOrderId === order.orderId}
                          >
                            {downloadingOrderId === order.orderId ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-1" />
                                Download File
                              </>
                            )}
                          </Button>
                          <div className="relative">
                            <Select
                              value={order.status}
                              onValueChange={(val) => handleStatusChange(order.orderId, val as OrderStatus)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
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
                                    Ready
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
                            {isUpdating && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
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
        </TooltipProvider>
      </div>
    </div>
  );
};

export default AdminOrders;
