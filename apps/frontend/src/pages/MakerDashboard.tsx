import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Printer,
  Plus,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  Package,
  Clock,
  DollarSign,
  Activity,
  MapPin,
  Settings,
} from "lucide-react";
import {
  useMyMakerProfile,
  useUpdateMakerProfile,
  useUpdateMakerAvailability,
  useAddPrinter,
  useUpdatePrinter,
  useDeletePrinter,
  useAddMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useMakerStats,
  useMakerCapacity,
} from "@/hooks/api/useMakers";
import { useMakerUpdates } from "@/hooks/useMakerUpdates";
import {
  MakerUpdate,
  PrinterCreate,
  PrinterUpdate,
  MaterialCreate,
  MaterialUpdate,
  PrinterResponse,
  MaterialResponse,
} from "@/types/api";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorFallback from "@/components/ErrorFallback";

const MakerDashboard = () => {
  const navigate = useNavigate();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterResponse | null>(
    null
  );
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialResponse | null>(null);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");

  // Fetch maker data
  const {
    data: makerProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useMyMakerProfile();

  const {
    data: makerStats,
    isLoading: statsLoading,
    error: statsError,
  } = useMakerStats(makerProfile?.id || "");

  const {
    data: capacityInfo,
    isLoading: capacityLoading,
    error: capacityError,
  } = useMakerCapacity(makerProfile?.id || "");

  // Set up real-time updates for this maker
  const { connected: wsConnected } = useMakerUpdates({
    makerId: makerProfile?.id,
    enableNotifications: true,
  });

  // Mutations
  const updateProfileMutation = useUpdateMakerProfile();
  const updateAvailabilityMutation = useUpdateMakerAvailability();
  const addPrinterMutation = useAddPrinter();
  const updatePrinterMutation = useUpdatePrinter();
  const deletePrinterMutation = useDeletePrinter();
  const addMaterialMutation = useAddMaterial();
  const updateMaterialMutation = useUpdateMaterial();
  const deleteMaterialMutation = useDeleteMaterial();

  // Form states
  const [profileForm, setProfileForm] = useState<MakerUpdate>({});
  const [printerForm, setPrinterForm] = useState<PrinterCreate | PrinterUpdate>(
    {}
  );
  const [materialForm, setMaterialForm] = useState<
    MaterialCreate | MaterialUpdate
  >({});

  // Initialize forms when data loads
  useEffect(() => {
    if (makerProfile) {
      setProfileForm({
        name: makerProfile.name,
        description: makerProfile.description,
        location_address: makerProfile.location_address,
        location_lat: makerProfile.location_lat,
        location_lng: makerProfile.location_lng,
      });
    }
  }, [makerProfile]);

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!makerProfile) return;

    try {
      await updateProfileMutation.mutateAsync({
        makerId: makerProfile.id,
        data: profileForm,
      });
      setShowProfileEdit(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle availability toggle
  const handleAvailabilityToggle = async (available: boolean) => {
    if (!makerProfile) return;

    try {
      await updateAvailabilityMutation.mutateAsync({
        makerId: makerProfile.id,
        available,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle printer operations
  const handleAddPrinter = async () => {
    if (!makerProfile) return;

    try {
      await addPrinterMutation.mutateAsync({
        makerId: makerProfile.id,
        data: printerForm as PrinterCreate,
      });
      setPrinterForm({});
      setShowPrinterDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdatePrinter = async () => {
    if (!editingPrinter) return;

    try {
      await updatePrinterMutation.mutateAsync({
        printerId: editingPrinter.id,
        data: printerForm as PrinterUpdate,
      });
      setPrinterForm({});
      setEditingPrinter(null);
      setShowPrinterDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeletePrinter = async (printerId: string) => {
    try {
      await deletePrinterMutation.mutateAsync(printerId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle material operations
  const handleAddMaterial = async () => {
    if (!selectedPrinterId) return;

    try {
      await addMaterialMutation.mutateAsync({
        printerId: selectedPrinterId,
        data: materialForm as MaterialCreate,
      });
      setMaterialForm({});
      setSelectedPrinterId("");
      setShowMaterialDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;

    try {
      await updateMaterialMutation.mutateAsync({
        materialId: editingMaterial.id,
        data: materialForm as MaterialUpdate,
      });
      setMaterialForm({});
      setEditingMaterial(null);
      setShowMaterialDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      await deleteMaterialMutation.mutateAsync(materialId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Open edit dialogs
  const openEditPrinter = (printer: PrinterResponse) => {
    setEditingPrinter(printer);
    setPrinterForm({
      name: printer.name,
      brand: printer.brand,
      model: printer.model,
      build_volume_x: printer.build_volume_x,
      build_volume_y: printer.build_volume_y,
      build_volume_z: printer.build_volume_z,
      hourly_rate: printer.hourly_rate,
      active: printer.active,
    });
    setShowPrinterDialog(true);
  };

  const openEditMaterial = (material: MaterialResponse) => {
    setEditingMaterial(material);
    setMaterialForm({
      type: material.type,
      brand: material.brand,
      color_name: material.color_name,
      color_hex: material.color_hex,
      price_per_gram: material.price_per_gram,
      stock_grams: material.stock_grams,
      available: material.available,
    });
    setShowMaterialDialog(true);
  };

  const openAddMaterial = (printerId: string) => {
    setSelectedPrinterId(printerId);
    setMaterialForm({
      type: "PLA",
      color_name: "",
      color_hex: "#000000",
      price_per_gram: 0.03,
      stock_grams: 1000,
      available: true,
    });
    setShowMaterialDialog(true);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (profileError || !makerProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorFallback
            error={profileError as Error}
            title="Failed to load maker profile"
            message="You may need to create a maker profile first."
            showRetry={true}
            action={{
              label: "Create Profile",
              onClick: () => navigate("/maker/setup"),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-text-primary">
              Maker Dashboard
            </h1>
            <div className="flex items-center mt-1 space-x-4">
              <p className="text-text-muted">
                Manage your printing services and track performance
              </p>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    wsConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm text-text-muted">
                  {wsConnected ? "Live updates" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="availability">Available for orders</Label>
              <Switch
                id="availability"
                checked={makerProfile.available}
                onCheckedChange={handleAvailabilityToggle}
                disabled={updateAvailabilityMutation.isPending}
              />
            </div>
            <Button variant="outline" onClick={() => setShowProfileEdit(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-text-muted">Rating</p>
                  <p className="text-2xl font-semibold">
                    {makerProfile.rating.toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-text-muted">Total Prints</p>
                  <p className="text-2xl font-semibold">
                    {makerProfile.total_prints}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-text-muted">Revenue</p>
                  <p className="text-2xl font-semibold">
                    $
                    {statsLoading
                      ? "..."
                      : makerStats?.total_revenue.toFixed(0) || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-text-muted">Capacity</p>
                  <p className="text-2xl font-semibold">
                    {capacityLoading
                      ? "..."
                      : capacityInfo?.estimated_capacity || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Profile Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">{makerProfile.name}</h3>
                <p className="text-text-muted mb-4">
                  {makerProfile.description || "No description provided"}
                </p>
                <div className="flex items-center text-sm text-text-muted">
                  <MapPin className="w-4 h-4 mr-1" />
                  {makerProfile.location_address || "Location not specified"}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <Badge
                    variant={makerProfile.available ? "default" : "secondary"}
                  >
                    {makerProfile.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Verified</span>
                  <Badge
                    variant={makerProfile.verified ? "default" : "outline"}
                  >
                    {makerProfile.verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Printers</span>
                  <span>{makerProfile.printers.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printers Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Printer className="w-5 h-5 mr-2" />
                Printers ({makerProfile.printers.length})
              </CardTitle>
              <Dialog
                open={showPrinterDialog}
                onOpenChange={setShowPrinterDialog}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingPrinter(null);
                      setPrinterForm({
                        name: "",
                        brand: "",
                        model: "",
                        build_volume_x: 200,
                        build_volume_y: 200,
                        build_volume_z: 200,
                        hourly_rate: 15,
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Printer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPrinter ? "Edit Printer" : "Add New Printer"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="printer-name">Name</Label>
                      <Input
                        id="printer-name"
                        value={printerForm.name || ""}
                        onChange={(e) =>
                          setPrinterForm({
                            ...printerForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="e.g., Prusa i3 MK3S+"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="printer-brand">Brand</Label>
                        <Input
                          id="printer-brand"
                          value={printerForm.brand || ""}
                          onChange={(e) =>
                            setPrinterForm({
                              ...printerForm,
                              brand: e.target.value,
                            })
                          }
                          placeholder="e.g., Prusa"
                        />
                      </div>
                      <div>
                        <Label htmlFor="printer-model">Model</Label>
                        <Input
                          id="printer-model"
                          value={printerForm.model || ""}
                          onChange={(e) =>
                            setPrinterForm({
                              ...printerForm,
                              model: e.target.value,
                            })
                          }
                          placeholder="e.g., i3 MK3S+"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="build-x">Build X (mm)</Label>
                        <Input
                          id="build-x"
                          type="number"
                          value={printerForm.build_volume_x || ""}
                          onChange={(e) =>
                            setPrinterForm({
                              ...printerForm,
                              build_volume_x: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="build-y">Build Y (mm)</Label>
                        <Input
                          id="build-y"
                          type="number"
                          value={printerForm.build_volume_y || ""}
                          onChange={(e) =>
                            setPrinterForm({
                              ...printerForm,
                              build_volume_y: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="build-z">Build Z (mm)</Label>
                        <Input
                          id="build-z"
                          type="number"
                          value={printerForm.build_volume_z || ""}
                          onChange={(e) =>
                            setPrinterForm({
                              ...printerForm,
                              build_volume_z: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
                      <Input
                        id="hourly-rate"
                        type="number"
                        step="0.01"
                        value={printerForm.hourly_rate || ""}
                        onChange={(e) =>
                          setPrinterForm({
                            ...printerForm,
                            hourly_rate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    {editingPrinter && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="printer-active"
                          checked={printerForm.active ?? true}
                          onCheckedChange={(checked) =>
                            setPrinterForm({ ...printerForm, active: checked })
                          }
                        />
                        <Label htmlFor="printer-active">Active</Label>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPrinterDialog(false);
                          setEditingPrinter(null);
                          setPrinterForm({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={
                          editingPrinter
                            ? handleUpdatePrinter
                            : handleAddPrinter
                        }
                        disabled={
                          addPrinterMutation.isPending ||
                          updatePrinterMutation.isPending
                        }
                      >
                        {editingPrinter ? "Update" : "Add"} Printer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {makerProfile.printers.length === 0 ? (
              <div className="text-center py-8">
                <Printer className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">No printers added yet</p>
                <p className="text-sm text-text-muted">
                  Add your first printer to start accepting orders
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {makerProfile.printers.map((printer) => (
                  <div
                    key={printer.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{printer.name}</h4>
                        <Badge
                          variant={printer.active ? "default" : "secondary"}
                        >
                          {printer.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPrinter(printer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Printer
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this printer?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePrinter(printer.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Brand:</span>
                        <p>{printer.brand || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-text-muted">Model:</span>
                        <p>{printer.model || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-text-muted">Build Volume:</span>
                        <p>
                          {printer.build_volume_x}×{printer.build_volume_y}×
                          {printer.build_volume_z}mm
                        </p>
                      </div>
                      <div>
                        <span className="text-text-muted">Rate:</span>
                        <p>${printer.hourly_rate}/hr</p>
                      </div>
                    </div>

                    {/* Materials for this printer */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Materials ({printer.materials.length})
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddMaterial(printer.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Material
                        </Button>
                      </div>
                      {printer.materials.length === 0 ? (
                        <p className="text-sm text-text-muted">
                          No materials added
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {printer.materials.map((material) => (
                            <div
                              key={material.id}
                              className="flex items-center justify-between p-2 bg-neutral-50 rounded"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-4 h-4 rounded-full border"
                                  style={{
                                    backgroundColor: material.color_hex,
                                  }}
                                />
                                <span className="text-sm">
                                  {material.type} - {material.color_name}
                                </span>
                                <Badge
                                  variant={
                                    material.available ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {material.available
                                    ? "Available"
                                    : "Out of Stock"}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditMaterial(material)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Material
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this
                                        material? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteMaterial(material.id)
                                        }
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Edit Dialog */}
        <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name || ""}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="profile-description">Description</Label>
                <Textarea
                  id="profile-description"
                  value={profileForm.description || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Tell customers about your printing services..."
                />
              </div>
              <div>
                <Label htmlFor="profile-address">Address</Label>
                <Input
                  id="profile-address"
                  value={profileForm.location_address || ""}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      location_address: e.target.value,
                    })
                  }
                  placeholder="Your business address"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowProfileEdit(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProfileUpdate}
                  disabled={updateProfileMutation.isPending}
                >
                  Update Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Material Dialog */}
        <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? "Edit Material" : "Add New Material"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material-type">Type</Label>
                  <select
                    id="material-type"
                    value={materialForm.type || "PLA"}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                  >
                    <option value="PLA">PLA</option>
                    <option value="ABS">ABS</option>
                    <option value="PETG">PETG</option>
                    <option value="TPU">TPU</option>
                    <option value="ASA">ASA</option>
                    <option value="PC">Polycarbonate</option>
                    <option value="Nylon">Nylon</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="material-brand">Brand</Label>
                  <Input
                    id="material-brand"
                    value={materialForm.brand || ""}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        brand: e.target.value,
                      })
                    }
                    placeholder="e.g., Prusament"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material-color">Color Name</Label>
                  <Input
                    id="material-color"
                    value={materialForm.color_name || ""}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        color_name: e.target.value,
                      })
                    }
                    placeholder="e.g., Galaxy Black"
                  />
                </div>
                <div>
                  <Label htmlFor="material-hex">Color</Label>
                  <Input
                    id="material-hex"
                    type="color"
                    value={materialForm.color_hex || "#000000"}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        color_hex: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material-price">Price per gram ($)</Label>
                  <Input
                    id="material-price"
                    type="number"
                    step="0.001"
                    value={materialForm.price_per_gram || ""}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        price_per_gram: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="material-stock">Stock (grams)</Label>
                  <Input
                    id="material-stock"
                    type="number"
                    value={materialForm.stock_grams || ""}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        stock_grams: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              {editingMaterial && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="material-available"
                    checked={materialForm.available ?? true}
                    onCheckedChange={(checked) =>
                      setMaterialForm({ ...materialForm, available: checked })
                    }
                  />
                  <Label htmlFor="material-available">Available</Label>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMaterialDialog(false);
                    setEditingMaterial(null);
                    setSelectedPrinterId("");
                    setMaterialForm({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingMaterial ? handleUpdateMaterial : handleAddMaterial
                  }
                  disabled={
                    addMaterialMutation.isPending ||
                    updateMaterialMutation.isPending
                  }
                >
                  {editingMaterial ? "Update" : "Add"} Material
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MakerDashboard;
