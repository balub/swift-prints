// Base API client configuration and shared types

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/v1/api";

// Base fetch wrapper with error handling
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Multipart form data request (for file uploads)
export async function apiFormRequest<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Shared Types

export interface BoundingBox {
  x: number;
  y: number;
  z: number;
}

export interface BaseEstimate {
  filamentGrams: number;
  printTimeHours: number;
}

export interface CostBreakdown {
  material: number;
  machineTime: number;
  total: number;
}

export type OrderStatus =
  | "PLACED"
  | "PRINTING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

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

export interface UploadResponse {
  uploadId: string;
  filename: string;
  volumeMm3: number;
  boundingBox: BoundingBox;
  needsSupports: boolean;
  baseEstimate: BaseEstimate;
  createdAt: string;
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

export interface OrderStats {
  totalOrders: number;
  placedOrders: number;
  printingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

export interface EstimateResponse {
  filamentUsedGrams: number;
  printTimeHours: number;
  costBreakdown: CostBreakdown;
  printerName: string;
  filamentName: string;
}

// Query Keys factory for consistent key management
export const queryKeys = {
  // Uploads
  uploads: {
    all: ["uploads"] as const,
    detail: (id: string) => ["uploads", id] as const,
    download: (id: string) => ["uploads", id, "download"] as const,
  },
  // Printers
  printers: {
    all: ["printers"] as const,
    detail: (id: string) => ["printers", id] as const,
  },
  // Orders
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  // Pricing
  pricing: {
    estimate: (uploadId: string, printerId: string, filamentId: string) =>
      ["pricing", "estimate", uploadId, printerId, filamentId] as const,
    quickEstimate: (uploadId: string, printerId: string, filamentId: string) =>
      ["pricing", "quick-estimate", uploadId, printerId, filamentId] as const,
  },
  // Admin
  admin: {
    orders: {
      all: ["admin", "orders"] as const,
      filtered: (filters: { status?: string; teamNumber?: string }) =>
        ["admin", "orders", filters] as const,
      detail: (id: string) => ["admin", "orders", id] as const,
      stats: ["admin", "orders", "stats"] as const,
    },
    printers: {
      all: ["admin", "printers"] as const,
      detail: (id: string) => ["admin", "printers", id] as const,
    },
  },
  // Health
  health: ["health"] as const,
} as const;

