/**
 * Real-time Context Provider
 * Provides real-time updates functionality throughout the app
 */
import React, { createContext, useContext, ReactNode } from "react";
import {
  useRealTimeService,
  RealTimeServiceOptions,
  RealTimeServiceState,
} from "@/services/realTimeService";
import { PricingParams } from "@/types/api";

interface RealTimeContextType extends RealTimeServiceState {
  // Order subscriptions
  subscribeToOrder: (orderId: string) => void;
  unsubscribeFromOrder: (orderId: string) => void;

  // Pricing subscriptions
  subscribeToPricing: (params: PricingParams) => void;
  unsubscribeFromPricing: (params: PricingParams) => void;

  // Analysis subscriptions
  subscribeToAnalysis: (jobId: string) => void;
  unsubscribeFromAnalysis: (jobId: string) => void;

  // Connection management
  reconnect: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(
  undefined
);

interface RealTimeProviderProps {
  children: ReactNode;
  options?: RealTimeServiceOptions;
}

export function RealTimeProvider({ children, options }: RealTimeProviderProps) {
  const realTimeService = useRealTimeService(options);

  const value: RealTimeContextType = {
    ...realTimeService,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime(): RealTimeContextType {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error("useRealTime must be used within a RealTimeProvider");
  }
  return context;
}

export default RealTimeContext;
