/**
 * Payment API hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

// Payment types
export interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "bank_transfer";
  last4?: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default?: boolean;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "processing"
    | "succeeded"
    | "canceled";
  client_secret?: string;
  payment_method_id?: string;
  created_at: string;
}

export interface CreatePaymentIntentRequest {
  order_id: string;
  payment_method_id?: string;
  save_payment_method?: boolean;
}

export interface ConfirmPaymentRequest {
  payment_intent_id: string;
  payment_method_id: string;
}

export interface AddPaymentMethodRequest {
  type: "card";
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  cvc: string;
  cardholder_name: string;
  billing_address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  set_as_default?: boolean;
}

export interface PaymentHistory {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_method: {
    type: string;
    last4?: string;
    brand?: string;
  };
  created_at: string;
  updated_at: string;
}

// Payment method queries
export function usePaymentMethods() {
  return useQuery({
    queryKey: queryKeys.payments.methods(),
    queryFn: async () => {
      const response = await apiClient.get<PaymentMethod[]>(
        "/api/payments/methods"
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: queryKeys.payments.history(),
    queryFn: async () => {
      const response = await apiClient.get<PaymentHistory[]>(
        "/api/payments/history"
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function usePaymentIntent(paymentIntentId: string) {
  return useQuery({
    queryKey: queryKeys.payments.intent(paymentIntentId),
    queryFn: async () => {
      const response = await apiClient.get<PaymentIntent>(
        `/api/payments/intents/${paymentIntentId}`
      );
      return response.data;
    },
    enabled: !!paymentIntentId,
    refetchInterval: (data) => {
      // Stop polling when payment is complete
      return data?.status === "succeeded" || data?.status === "canceled"
        ? false
        : 2000;
    },
  });
}

// Payment mutations
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentIntentRequest) => {
      const response = await apiClient.post<PaymentIntent>(
        "/api/payments/intents",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Cache the payment intent
      queryClient.setQueryData(queryKeys.payments.intent(data.id), data);

      toast.success("Payment initialized");
    },
    onError: (error: any) => {
      toast.error("Failed to initialize payment", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfirmPaymentRequest) => {
      const response = await apiClient.post<PaymentIntent>(
        `/api/payments/intents/${data.payment_intent_id}/confirm`,
        { payment_method_id: data.payment_method_id }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Update payment intent cache
      queryClient.setQueryData(queryKeys.payments.intent(data.id), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      if (data.status === "succeeded") {
        toast.success("Payment completed successfully!");
      }
    },
    onError: (error: any) => {
      toast.error("Payment failed", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddPaymentMethodRequest) => {
      const response = await apiClient.post<PaymentMethod>(
        "/api/payments/methods",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Update payment methods cache
      queryClient.setQueryData(
        queryKeys.payments.methods(),
        (oldData: PaymentMethod[] | undefined) => {
          if (!oldData) return [data];
          return [...oldData, data];
        }
      );

      toast.success("Payment method added successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add payment method", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      await apiClient.delete(`/api/payments/methods/${paymentMethodId}`);
      return paymentMethodId;
    },
    onSuccess: (paymentMethodId) => {
      // Remove from payment methods cache
      queryClient.setQueryData(
        queryKeys.payments.methods(),
        (oldData: PaymentMethod[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((method) => method.id !== paymentMethodId);
        }
      );

      toast.success("Payment method removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove payment method", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiClient.put<PaymentMethod>(
        `/api/payments/methods/${paymentMethodId}/default`
      );
      return response.data;
    },
    onSuccess: (updatedMethod) => {
      // Update payment methods cache
      queryClient.setQueryData(
        queryKeys.payments.methods(),
        (oldData: PaymentMethod[] | undefined) => {
          if (!oldData) return [updatedMethod];
          return oldData.map((method) => ({
            ...method,
            is_default: method.id === updatedMethod.id,
          }));
        }
      );

      toast.success("Default payment method updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update default payment method", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}

export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      reason,
    }: {
      paymentId: string;
      amount?: number;
      reason?: string;
    }) => {
      const response = await apiClient.post(
        `/api/payments/${paymentId}/refund`,
        { amount, reason }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate payment history to show refund
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.history() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });

      toast.success("Refund processed successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to process refund", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });
}
