import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Printer,
  Loader2,
  RefreshCw,
  Edit,
  MoreHorizontal,
  Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAdminPrinters,
  createPrinter,
  updatePrinter,
  addFilament,
  updateFilament,
  type Printer as PrinterType,
  type Filament,
} from "@/lib/api";

const AdminPrinters = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for dialogs
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [showAddFilament, setShowAddFilament] = useState<string | null>(null);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [editingFilament, setEditingFilament] = useState<{ printer: PrinterType; filament: Filament } | null>(null);

  // Form state
  const [printerForm, setPrinterForm] = useState({ name: "", hourlyRate: "" });
  const [filamentForm, setFilamentForm] = useState({ filamentType: "", name: "", pricePerGram: "" });

  const { data: printers, isLoading, refetch } = useQuery({
    queryKey: ["adminPrinters"],
    queryFn: getAdminPrinters,
  });

  const createPrinterMutation = useMutation({
    mutationFn: createPrinter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPrinters"] });
      setShowAddPrinter(false);
      setPrinterForm({ name: "", hourlyRate: "" });
    },
  });

  const updatePrinterMutation = useMutation({
    mutationFn: ({ printerId, data }: { printerId: string; data: { name?: string; hourlyRate?: number; isActive?: boolean } }) =>
      updatePrinter(printerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPrinters"] });
      setEditingPrinter(null);
    },
  });

  const addFilamentMutation = useMutation({
    mutationFn: ({ printerId, filament }: { printerId: string; filament: { filamentType: string; name: string; pricePerGram: number } }) =>
      addFilament(printerId, filament),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPrinters"] });
      setShowAddFilament(null);
      setFilamentForm({ filamentType: "", name: "", pricePerGram: "" });
    },
  });

  const updateFilamentMutation = useMutation({
    mutationFn: ({ filamentId, data }: { filamentId: string; data: { name?: string; pricePerGram?: number; isActive?: boolean } }) =>
      updateFilament(filamentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPrinters"] });
      setEditingFilament(null);
    },
  });

  const handleCreatePrinter = () => {
    if (printerForm.name && printerForm.hourlyRate) {
      createPrinterMutation.mutate({
        name: printerForm.name,
        hourlyRate: parseFloat(printerForm.hourlyRate),
      });
    }
  };

  const handleAddFilament = () => {
    if (showAddFilament && filamentForm.filamentType && filamentForm.name && filamentForm.pricePerGram) {
      addFilamentMutation.mutate({
        printerId: showAddFilament,
        filament: {
          filamentType: filamentForm.filamentType.toLowerCase(),
          name: filamentForm.name,
          pricePerGram: parseFloat(filamentForm.pricePerGram),
        },
      });
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
            <h1 className="text-3xl font-light text-text-primary">Printers & Filaments</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddPrinter(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Printer
            </Button>
          </div>
        </div>

        {/* Printers List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : printers && printers.length > 0 ? (
          <div className="space-y-6">
            {printers.map((printer) => (
              <Card key={printer.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Printer className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{printer.name}</CardTitle>
                        <p className="text-sm text-text-muted">₹{printer.hourlyRate}/hr</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={printer.isActive ? "default" : "secondary"}>
                        {printer.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingPrinter(printer)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Printer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updatePrinterMutation.mutate({
                                printerId: printer.id,
                                data: { isActive: !printer.isActive },
                              })
                            }
                          >
                            {printer.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-text-muted">Filaments</h4>
                    <Button variant="outline" size="sm" onClick={() => setShowAddFilament(printer.id)}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Filament
                    </Button>
                  </div>
                  {printer.filaments.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {printer.filaments.map((filament) => (
                        <div
                          key={filament.id}
                          className={`p-3 border rounded-lg ${
                            filament.isActive ? "bg-background" : "bg-muted/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{filament.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {filament.filamentType.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary font-mono">
                              ₹{filament.pricePerGram.toFixed(2)}/g
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setEditingFilament({ printer, filament })}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-4">
                      No filaments added yet
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Printers Found</h3>
              <p className="text-text-muted mb-4">Add your first printer to get started</p>
              <Button onClick={() => setShowAddPrinter(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Printer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Printer Dialog */}
        <Dialog open={showAddPrinter} onOpenChange={setShowAddPrinter}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Printer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="printer-name">Printer Name</Label>
                <Input
                  id="printer-name"
                  placeholder="e.g., Prusa MK4"
                  value={printerForm.name}
                  onChange={(e) => setPrinterForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">Hourly Rate (₹)</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50"
                  value={printerForm.hourlyRate}
                  onChange={(e) => setPrinterForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPrinter(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePrinter}
                disabled={!printerForm.name || !printerForm.hourlyRate || createPrinterMutation.isPending}
              >
                {createPrinterMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Printer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Printer Dialog */}
        <Dialog open={!!editingPrinter} onOpenChange={() => setEditingPrinter(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Printer</DialogTitle>
            </DialogHeader>
            {editingPrinter && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-printer-name">Printer Name</Label>
                  <Input
                    id="edit-printer-name"
                    defaultValue={editingPrinter.name}
                    onBlur={(e) => {
                      if (e.target.value !== editingPrinter.name) {
                        updatePrinterMutation.mutate({
                          printerId: editingPrinter.id,
                          data: { name: e.target.value },
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hourly-rate">Hourly Rate (₹)</Label>
                  <Input
                    id="edit-hourly-rate"
                    type="number"
                    step="0.01"
                    defaultValue={editingPrinter.hourlyRate}
                    onBlur={(e) => {
                      const newRate = parseFloat(e.target.value);
                      if (newRate !== editingPrinter.hourlyRate) {
                        updatePrinterMutation.mutate({
                          printerId: editingPrinter.id,
                          data: { hourlyRate: newRate },
                        });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="printer-active">Active</Label>
                  <Switch
                    id="printer-active"
                    checked={editingPrinter.isActive}
                    onCheckedChange={(checked) =>
                      updatePrinterMutation.mutate({
                        printerId: editingPrinter.id,
                        data: { isActive: checked },
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setEditingPrinter(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Filament Dialog */}
        <Dialog open={!!showAddFilament} onOpenChange={() => setShowAddFilament(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Filament</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="filament-type">Filament Type</Label>
                <Input
                  id="filament-type"
                  placeholder="e.g., pla, abs, petg"
                  value={filamentForm.filamentType}
                  onChange={(e) => setFilamentForm((f) => ({ ...f, filamentType: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filament-name">Display Name</Label>
                <Input
                  id="filament-name"
                  placeholder="e.g., PLA Black"
                  value={filamentForm.name}
                  onChange={(e) => setFilamentForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-per-gram">Price per Gram (₹)</Label>
                <Input
                  id="price-per-gram"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 0.05"
                  value={filamentForm.pricePerGram}
                  onChange={(e) => setFilamentForm((f) => ({ ...f, pricePerGram: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddFilament(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddFilament}
                disabled={
                  !filamentForm.filamentType ||
                  !filamentForm.name ||
                  !filamentForm.pricePerGram ||
                  addFilamentMutation.isPending
                }
              >
                {addFilamentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Filament"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Filament Dialog */}
        <Dialog open={!!editingFilament} onOpenChange={() => setEditingFilament(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Filament</DialogTitle>
            </DialogHeader>
            {editingFilament && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-text-muted">
                    Printer: <span className="font-medium">{editingFilament.printer.name}</span>
                  </p>
                  <p className="text-sm text-text-muted">
                    Type: <Badge variant="outline">{editingFilament.filament.filamentType.toUpperCase()}</Badge>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-filament-name">Display Name</Label>
                  <Input
                    id="edit-filament-name"
                    defaultValue={editingFilament.filament.name}
                    onBlur={(e) => {
                      if (e.target.value !== editingFilament.filament.name) {
                        updateFilamentMutation.mutate({
                          filamentId: editingFilament.filament.id,
                          data: { name: e.target.value },
                        });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-per-gram">Price per Gram (₹)</Label>
                  <Input
                    id="edit-price-per-gram"
                    type="number"
                    step="0.01"
                    defaultValue={editingFilament.filament.pricePerGram}
                    onBlur={(e) => {
                      const newPrice = parseFloat(e.target.value);
                      if (newPrice !== editingFilament.filament.pricePerGram) {
                        updateFilamentMutation.mutate({
                          filamentId: editingFilament.filament.id,
                          data: { pricePerGram: newPrice },
                        });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="filament-active">Active</Label>
                  <Switch
                    id="filament-active"
                    checked={editingFilament.filament.isActive}
                    onCheckedChange={(checked) =>
                      updateFilamentMutation.mutate({
                        filamentId: editingFilament.filament.id,
                        data: { isActive: checked },
                      })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setEditingFilament(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPrinters;

