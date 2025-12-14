// API client for Swift Prints backend

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/v1/api";

// Types based on OpenAPI schema
export interface BoundingBox {
  x: number;
  y: number;
  z: number;
}

export interface BaseEstimate {
  filamentGrams: number;
  printTimeHours: number;
}

export interface UploadResponse {
  uploadId: string;
  filename: string;
  volumeMm3: number;
  boundingBox: BoundingBox;
  needsSupports: boolean;
  baseEstimate: BaseEstimate;
  createdAt: string;
}

export interface Filament {
  id: string;
  filamentType: string;
  name: string;
  pricePerGram: number;
  isActive: boolean;
}

export interface Printer {
  id: string;
  name: string;
  hourlyRate: number;
  isActive: boolean;
  filaments: Filament[];
}

export interface CostBreakdown {
  material: number;
  machineTime: number;
  total: number;
}

export interface EstimateResponse {
  filamentUsedGrams: number;
  printTimeHours: number;
  costBreakdown: CostBreakdown;
  printerName: string;
  filamentName: string;
}

export interface Order {
  id: string;
  uploadId: string;
  printerId: string;
  filamentId: string;
  teamNumber: string;
  participantName: string;
  participantEmail: string;
  status: OrderStatus;
  filamentUsedGrams: number;
  printTimeHours: number;
  materialCost: number;
  machineTimeCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  printer?: Printer;
  filament?: Filament;
  upload?: UploadResponse;
}

export type OrderStatus =
  | "PLACED"
  | "PRINTING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderStats {
  totalOrders: number;
  placedOrders: number;
  printingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

// API functions

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}

// Uploads
export async function analyzeUpload(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/uploads/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Upload failed");
  }

  return res.json();
}

export async function getUpload(uploadId: string): Promise<UploadResponse> {
  const res = await fetch(`${API_BASE}/uploads/${uploadId}`);
  if (!res.ok) throw new Error("Failed to get upload");
  return res.json();
}

export async function getDownloadUrl(
  uploadId: string
): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/uploads/${uploadId}/download`);
  if (!res.ok) throw new Error("Failed to get download URL");
  return res.json();
}

// Printers
export async function getPrinters(): Promise<Printer[]> {
  const res = await fetch(`${API_BASE}/printers`);
  if (!res.ok) throw new Error("Failed to get printers");
  return res.json();
}

export async function getPrinter(printerId: string): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers/${printerId}`);
  if (!res.ok) throw new Error("Failed to get printer");
  return res.json();
}

// Pricing
export interface EstimateRequest {
  uploadId: string;
  printerId: string;
  filamentId: string;
  layerHeight?: number;
  infill?: number;
  supports?: "none" | "auto" | "everywhere";
}

export async function getEstimate(
  request: EstimateRequest
): Promise<EstimateResponse> {
  const res = await fetch(`${API_BASE}/pricing/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Estimate failed" }));
    throw new Error(error.message || "Failed to get estimate");
  }

  return res.json();
}

export async function getQuickEstimate(
  uploadId: string,
  printerId: string,
  filamentId: string
): Promise<EstimateResponse> {
  const params = new URLSearchParams({ uploadId, printerId, filamentId });
  const res = await fetch(`${API_BASE}/pricing/quick-estimate?${params}`);

  if (!res.ok) throw new Error("Failed to get quick estimate");
  return res.json();
}

// Orders
export interface CreateOrderRequest {
  uploadId: string;
  printerId: string;
  filamentId: string;
  teamNumber: string;
  participantName: string;
  participantEmail: string;
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "Order creation failed" }));
    throw new Error(error.message || "Failed to create order");
  }

  return res.json();
}

export async function getOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`);
  if (!res.ok) throw new Error("Failed to get order");
  return res.json();
}

// Admin APIs
export async function getAdminOrders(filters?: {
  status?: OrderStatus;
  teamNumber?: string;
}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.teamNumber) params.append("teamNumber", filters.teamNumber);

  const res = await fetch(`${API_BASE}/admin/orders?${params}`);
  if (!res.ok) throw new Error("Failed to get orders");
  return res.json();
}

export async function getOrderStats(): Promise<OrderStats> {
  const res = await fetch(`${API_BASE}/admin/orders/stats`);
  if (!res.ok) throw new Error("Failed to get order stats");
  return res.json();
}

export async function getAdminOrder(orderId: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}`);
  if (!res.ok) throw new Error("Failed to get order");
  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}

export async function getAdminPrinters(): Promise<Printer[]> {
  const res = await fetch(`${API_BASE}/admin/printers`);
  if (!res.ok) throw new Error("Failed to get printers");
  return res.json();
}

export interface CreatePrinterRequest {
  name: string;
  hourlyRate: number;
  filaments?: { filamentType: string; name: string; pricePerGram: number }[];
}

export async function createPrinter(
  request: CreatePrinterRequest
): Promise<Printer> {
  const res = await fetch(`${API_BASE}/admin/printers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) throw new Error("Failed to create printer");
  return res.json();
}

export async function updatePrinter(
  printerId: string,
  data: { name?: string; hourlyRate?: number; isActive?: boolean }
): Promise<Printer> {
  const res = await fetch(`${API_BASE}/admin/printers/${printerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update printer");
  return res.json();
}

export async function addFilament(
  printerId: string,
  filament: { filamentType: string; name: string; pricePerGram: number }
): Promise<Filament> {
  const res = await fetch(`${API_BASE}/admin/printers/${printerId}/filaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filament),
  });

  if (!res.ok) throw new Error("Failed to add filament");
  return res.json();
}

export async function updateFilament(
  filamentId: string,
  data: { name?: string; pricePerGram?: number; isActive?: boolean }
): Promise<Filament> {
  const res = await fetch(`${API_BASE}/admin/filaments/${filamentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to update filament");
  return res.json();
}
