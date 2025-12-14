import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Printer,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Settings,
} from "lucide-react";
import { getOrderStats, getAdminPrinters } from "@/lib/api";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["orderStats"],
    queryFn: getOrderStats,
  });

  const { data: printers, isLoading: loadingPrinters } = useQuery({
    queryKey: ["adminPrinters"],
    queryFn: getAdminPrinters,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-text-primary">Admin Dashboard</h1>
            <p className="text-text-muted mt-1">Manage orders and printers</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            <Settings className="w-3 h-3 mr-1" />
            Admin Mode
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {loadingStats ? (
            <div className="col-span-full flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  <p className="text-xs text-text-muted">Total Orders</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{stats.placedOrders}</p>
                  <p className="text-xs text-blue-600">Placed</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4 text-center">
                  <Printer className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{stats.printingOrders}</p>
                  <p className="text-xs text-yellow-600">Printing</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{stats.readyOrders}</p>
                  <p className="text-xs text-green-600">Ready</p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-primary">{stats.completedOrders}</p>
                  <p className="text-xs text-primary">Completed</p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">{stats.cancelledOrders}</p>
                  <p className="text-xs text-red-600">Cancelled</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="col-span-full text-center py-8 text-text-muted">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Failed to load statistics</p>
            </div>
          )}
        </div>

        {/* Revenue Card */}
        {stats && (
          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Total Revenue</p>
                    <p className="text-3xl font-bold text-primary">
                      ₹{stats.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/admin/orders")}>
                  View All Orders
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Orders Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary" />
                Orders Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4">
                View all orders, update status, and manage the print queue.
              </p>
              <Button onClick={() => navigate("/admin/orders")} className="w-full">
                Manage Orders
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Printers Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Printer className="w-5 h-5 mr-2 text-primary" />
                Printers & Filaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-muted mb-4">
                Add printers, manage filament options, and set pricing.
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm">
                  {loadingPrinters ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    <>
                      <span className="font-bold text-primary">{printers?.length || 0}</span> printers configured
                    </>
                  )}
                </span>
              </div>
              <Button onClick={() => navigate("/admin/printers")} className="w-full">
                Manage Printers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Printers Overview */}
        {printers && printers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Printers Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {printers.slice(0, 6).map((printer) => (
                  <div
                    key={printer.id}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{printer.name}</h4>
                      <Badge variant={printer.isActive ? "default" : "secondary"}>
                        {printer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted mb-2">
                      ₹{printer.hourlyRate}/hr • {printer.filaments.length} filaments
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {printer.filaments.slice(0, 3).map((f) => (
                        <Badge key={f.id} variant="outline" className="text-xs">
                          {f.name}
                        </Badge>
                      ))}
                      {printer.filaments.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{printer.filaments.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

