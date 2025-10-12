/**
 * Query key factories for consistent cache management
 */
import { MakerSearchFilters, OrderSearchFilters, UserRole } from "@/types/api";

export const queryKeys = {
  // Auth queries
  auth: {
    all: ["auth"] as const,
    user: () => [...queryKeys.auth.all, "user"] as const,
    profile: () => [...queryKeys.auth.all, "profile"] as const,
  },

  // File queries
  files: {
    all: ["files"] as const,
    file: (id: string) => [...queryKeys.files.all, id] as const,
    analysis: (fileId: string) =>
      [...queryKeys.files.all, "analysis", fileId] as const,
    analysisJob: (fileId: string) =>
      [...queryKeys.files.all, "analysis-job", fileId] as const,
    analysisStatus: (jobId: string) =>
      [...queryKeys.files.all, "analysis-status", jobId] as const,
    analysisResult: (resultId: string) =>
      [...queryKeys.files.all, "analysis-result", resultId] as const,
    fileAnalysisResults: (fileId: string) =>
      [...queryKeys.files.all, "file-analysis-results", fileId] as const,
  },

  // Maker queries
  makers: {
    all: ["makers"] as const,
    lists: () => [...queryKeys.makers.all, "list"] as const,
    list: (filters: MakerSearchFilters) =>
      [...queryKeys.makers.lists(), filters] as const,
    details: () => [...queryKeys.makers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.makers.details(), id] as const,
    me: () => [...queryKeys.makers.all, "me"] as const,
    capacity: (id: string) =>
      [...queryKeys.makers.all, "capacity", id] as const,
    stats: (id: string) => [...queryKeys.makers.all, "stats", id] as const,
  },

  // Printer queries
  printers: {
    all: ["printers"] as const,
    byMaker: (makerId: string) =>
      [...queryKeys.printers.all, "maker", makerId] as const,
    detail: (id: string) => [...queryKeys.printers.all, id] as const,
  },

  // Material queries
  materials: {
    all: ["materials"] as const,
    byPrinter: (printerId: string) =>
      [...queryKeys.materials.all, "printer", printerId] as const,
    detail: (id: string) => [...queryKeys.materials.all, id] as const,
  },

  // Order queries
  orders: {
    all: ["orders"] as const,
    lists: () => [...queryKeys.orders.all, "list"] as const,
    list: (filters: OrderSearchFilters) =>
      [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    stats: (role: UserRole) =>
      [...queryKeys.orders.all, "stats", role] as const,
    pending: () => [...queryKeys.orders.all, "pending"] as const,
  },

  // Pricing queries
  pricing: {
    all: ["pricing"] as const,
    calculate: (params: unknown) =>
      [...queryKeys.pricing.all, "calculate", params] as const,
    rates: (material: string, locationLat?: number, locationLng?: number) =>
      [
        ...queryKeys.pricing.all,
        "rates",
        material,
        locationLat,
        locationLng,
      ] as const,
    compare: (params: unknown) =>
      [...queryKeys.pricing.all, "compare", params] as const,
    quote: (quoteId: string) =>
      [...queryKeys.pricing.all, "quote", quoteId] as const,
    config: () => [...queryKeys.pricing.all, "config"] as const,
    session: (sessionId: string) =>
      [...queryKeys.pricing.all, "session", sessionId] as const,
  },

  // Upload queries
  uploads: {
    all: ["uploads"] as const,
    session: (sessionId: string) =>
      [...queryKeys.uploads.all, "session", sessionId] as const,
  },

  // Payment queries
  payments: {
    all: ["payments"] as const,
    methods: () => [...queryKeys.payments.all, "methods"] as const,
    history: () => [...queryKeys.payments.all, "history"] as const,
    intent: (intentId: string) =>
      [...queryKeys.payments.all, "intent", intentId] as const,
  },
} as const;

export default queryKeys;
