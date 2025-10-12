/**
 * Test file to verify maker management functionality
 * This is a simple verification that the components can be imported and basic types work
 */

// Test imports
import {
  MakerPublicResponse,
  MakerSearchFilters,
  CapacityInfo,
  MakerStats,
} from "@/types/api";

// Test type definitions
const testMakerPublicResponse: MakerPublicResponse = {
  id: "test-id",
  name: "Test Maker",
  description: "Test description",
  location_lat: 40.7128,
  location_lng: -74.006,
  location_address: "New York, NY",
  rating: 4.5,
  total_prints: 100,
  verified: true,
  available: true,
  printer_count: 3,
  material_types: ["PLA", "ABS", "PETG"],
};

const testSearchFilters: MakerSearchFilters = {
  location_lat: 40.7128,
  location_lng: -74.006,
  radius_km: 50,
  material_types: ["PLA"],
  min_rating: 4.0,
  verified_only: true,
  available_only: true,
  limit: 20,
  offset: 0,
};

const testCapacityInfo: CapacityInfo = {
  total_printers: 5,
  active_printers: 4,
  total_materials: 15,
  available_materials: 12,
  current_orders: 3,
  estimated_capacity: "medium",
};

const testMakerStats: MakerStats = {
  total_orders: 150,
  completed_orders: 145,
  average_rating: 4.6,
  total_revenue: 5000,
  completion_rate: 0.97,
  average_delivery_time: 3.5,
};

// Test that the types are correctly defined
console.log("Maker management types test passed:", {
  testMakerPublicResponse,
  testSearchFilters,
  testCapacityInfo,
  testMakerStats,
});

export {
  testMakerPublicResponse,
  testSearchFilters,
  testCapacityInfo,
  testMakerStats,
};
