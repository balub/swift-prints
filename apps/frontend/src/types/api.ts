/**
 * TypeScript interfaces for API request/response types
 */

// Base types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// User and Authentication Types
export interface User extends BaseEntity {
  email: string;
  role: UserRole;
}

export enum UserRole {
  CUSTOMER = "customer",
  MAKER = "maker",
  ADMIN = "admin",
}

export interface AuthResponse {
  user: User;
  session: Session;
  error?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// File Upload Types
export interface UploadedFile extends BaseEntity {
  filename: string;
  original_filename: string;
  file_size: number;
  storage_path?: string;
  storage_backend?: string;
  uploaded_at: string;
}

export interface InitiateUploadRequest {
  filename: string;
  file_size: number;
  content_type: string;
}

export interface InitiateUploadResponse {
  session_id: string;
  upload_url: string;
  expires_at: string;
  max_file_size: number;
}

export interface CompleteUploadRequest {
  session_id: string;
}

export interface CompleteUploadResponse {
  file_id: string;
  filename: string;
  file_size: number;
  upload_completed_at: string;
}

export interface UploadStatusResponse {
  session_id: string;
  status: string;
  filename: string;
  file_size: number;
  expires_at: string;
  file_uploaded: boolean;
  can_complete: boolean;
}

// Analysis Types
export interface AnalysisResult extends BaseEntity {
  file_id: string;
  settings?: PrintSettings;
  filament_grams: number;
  print_time_hours: number;
  volume_mm3: number;
  complexity_score: number;
  supports_required: boolean;
  analyzed_at: string;
}

export interface AnalysisRequest {
  file_id: string;
  settings?: PrintSettings;
}

export interface AnalysisJobResponse {
  job_id: string;
  message: string;
}

export interface AnalysisStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  result_id?: string;
  error?: string;
  message?: string;
}

export interface PrintMetrics {
  filament_grams: number;
  print_time_hours: number;
  volume_mm3: number;
  complexity_score: number;
  supports_required: boolean;
}

export interface AnalysisResultResponse {
  id: string;
  file_id: string;
  settings: Record<string, any>;
  metrics: PrintMetrics;
  analyzed_at: string;
}

// Print Settings Types
export interface PrintSettings {
  layer_height: number;
  infill_density: number;
  infill_pattern: string;
  supports: boolean;
  bed_adhesion: string;
  material_type: string;
  nozzle_temperature: number;
  bed_temperature: number;
}

// Maker Types
export interface MakerCreate {
  name: string;
  description?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
}

export interface MakerUpdate {
  name?: string;
  description?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  available?: boolean;
}

export interface MakerResponse extends BaseEntity {
  user_id: string;
  name: string;
  description?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  rating: number;
  total_prints: number;
  verified: boolean;
  available: boolean;
  printers: PrinterResponse[];
}

export interface MakerPublicResponse {
  id: string;
  name: string;
  description?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  rating: number;
  total_prints: number;
  verified: boolean;
  available: boolean;
  printer_count: number;
  material_types: string[];
}

export interface MakerSearchFilters {
  location_lat?: number;
  location_lng?: number;
  radius_km?: number;
  material_types?: string[];
  min_rating?: number;
  verified_only?: boolean;
  available_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface CapacityInfo {
  total_printers: number;
  active_printers: number;
  total_materials: number;
  available_materials: number;
  current_orders: number;
  estimated_capacity: string; // "low", "medium", "high"
}

export interface MakerStats {
  total_orders: number;
  completed_orders: number;
  average_rating: number;
  total_revenue: number;
  completion_rate: number;
  average_delivery_time?: number; // in days
}

// Printer Types
export interface PrinterCreate {
  name: string;
  brand?: string;
  model?: string;
  build_volume_x?: number;
  build_volume_y?: number;
  build_volume_z?: number;
  hourly_rate?: number;
}

export interface PrinterUpdate {
  name?: string;
  brand?: string;
  model?: string;
  build_volume_x?: number;
  build_volume_y?: number;
  build_volume_z?: number;
  hourly_rate?: number;
  active?: boolean;
}

export interface PrinterResponse extends BaseEntity {
  maker_id: string;
  name: string;
  brand?: string;
  model?: string;
  build_volume_x?: number;
  build_volume_y?: number;
  build_volume_z?: number;
  hourly_rate?: number;
  active: boolean;
  materials: MaterialResponse[];
  capabilities?: PrinterCapabilities;
}

export interface PrinterCapabilities {
  layer_heights: number[];
  infill_types: string[];
  supports_vase_mode: boolean;
  supports_bed_adhesion: string[];
}

// Material Types
export interface MaterialCreate {
  type: string;
  brand?: string;
  color_name: string;
  color_hex: string;
  price_per_gram: number;
  stock_grams?: number;
}

export interface MaterialUpdate {
  type?: string;
  brand?: string;
  color_name?: string;
  color_hex?: string;
  price_per_gram?: number;
  stock_grams?: number;
  available?: boolean;
}

export interface MaterialResponse extends BaseEntity {
  printer_id: string;
  type: string;
  brand?: string;
  color_name: string;
  color_hex: string;
  price_per_gram: number;
  stock_grams: number;
  available: boolean;
}

// Order Types
export interface OrderCreate {
  file_id: string;
  analysis_id: string;
  maker_id?: string;
  settings: PrintSettings;
  delivery_address: string;
  special_instructions?: string;
}

export interface OrderUpdate {
  settings?: PrintSettings;
  delivery_address?: string;
  special_instructions?: string;
}

export interface OrderStatusUpdate {
  status: OrderStatus;
  notes?: string;
  estimated_completion?: string;
}

export interface OrderResponse extends BaseEntity {
  customer_id: string;
  maker_id?: string;
  file_id: string;
  analysis_id: string;
  settings: PrintSettings;
  pricing?: PricingBreakdown;
  status: OrderStatus;
  delivery_address: string;
  special_instructions?: string;
  file?: UploadedFile;
  analysis?: AnalysisResult;
  maker?: MakerPublicResponse;
}

export interface OrderSummary {
  id: string;
  file_name: string;
  maker_name?: string;
  status: OrderStatus;
  total_price?: number;
  created_at: string;
  estimated_completion?: string;
}

export enum OrderStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface OrderSearchFilters {
  status?: OrderStatus[];
  date_from?: Date;
  date_to?: Date;
  customer_id?: string;
  maker_id?: string;
  limit?: number;
  offset?: number;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_spent?: number;
  average_order_value?: number;
}

export interface OrderAssignment {
  order_id: string;
  maker_id: string;
  estimated_completion?: Date;
  notes?: string;
}

export interface OrderCancellation {
  reason: string;
  refund_requested?: boolean;
}

export interface OrderRating {
  rating: number;
  review?: string;
}

// Pricing Types
export interface PricingBreakdown {
  material_cost: number;
  labor_cost: number;
  complexity_premium: number;
  rush_premium: number;
  quantity_discount: number;
  platform_fee: number;
  subtotal: number;
  total: number;
  per_unit_cost: number;
  estimated_delivery_days: number;
  breakdown_details: Record<string, unknown>;
  applied_discount?: {
    code: string;
    amount: number;
    type: string;
  };
  currency: string;
}

export interface PricingParams {
  analysis_id: string;
  maker_id: string;
  material_type: string;
  quantity?: number;
  rush_order?: boolean;
}

export interface PricingRequest {
  analysis_id: string;
  maker_id: string;
  material_type: string;
  quantity: number;
  rush_order: boolean;
}

export interface MarketRates {
  material_type: string;
  min_price_per_gram: number;
  max_price_per_gram: number;
  avg_price_per_gram: number;
  sample_size: number;
}

export interface PriceComparisonRequest {
  analysis_id: string;
  material_type: string;
  quantity: number;
  location_lat?: number;
  location_lng?: number;
  radius_km?: number;
  max_results?: number;
}

export interface MakerPriceComparison {
  maker_id: string;
  maker_name: string;
  total_price: number;
  per_unit_price: number;
  estimated_delivery_days: number;
  rating: number;
  total_prints: number;
  verified: boolean;
  available: boolean;
  pricing_breakdown: PricingBreakdown;
}

export interface QuoteRequest {
  analysis_id: string;
  maker_id: string;
  material_type: string;
  quantity: number;
  rush_order: boolean;
  discount_code?: string;
  shipping_address?: string;
  special_instructions?: string;
}

export interface Quote {
  quote_id: string;
  analysis_id: string;
  maker_id: string;
  maker_name: string;
  pricing: PricingBreakdown;
  material_info: {
    type: string;
    brand?: string;
    color_name: string;
    color_hex: string;
    price_per_gram: number;
  };
  print_settings: Record<string, unknown>;
  estimated_completion_date: string;
  valid_until: string;
  terms_and_conditions: string;
}

export interface PricingConfig {
  base_labor_rate: number;
  platform_fee_percentage: number;
  complexity_multipliers: Record<string, number>;
  quantity_discount_tiers: Array<{
    min_quantity: number;
    discount: number;
  }>;
  rush_order_premium: number;
}

export interface PricingSession {
  session_id: string;
  analysis_id: string;
  current_pricing?: PricingBreakdown;
  available_materials: string[];
  maker_options: MakerPriceComparison[];
  expires_at: string;
}

export interface PricingUpdateRequest {
  material_type?: string;
  quantity?: number;
  rush_order?: boolean;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface OrderUpdateMessage extends WebSocketMessage {
  type: "order_update";
  data: {
    order_id: string;
    status: OrderStatus;
    order: OrderResponse;
  };
}

export interface PricingUpdateMessage extends WebSocketMessage {
  type: "pricing_update";
  data: {
    params: PricingParams;
    pricing: PricingBreakdown;
  };
}

export interface AnalysisUpdateMessage extends WebSocketMessage {
  type: "analysis_update";
  data: {
    job_id: string;
    status: string;
    progress?: number;
    result?: AnalysisResult;
  };
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  request_id?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}
