import { apiClient } from '@/services/api';
import type { PaymentCreationResponse, PaymentStatusResponse } from '@/types/payment';

type AuthenticatedOptions = {
  accessToken: string;
};

export const paymentService = {
  createPayGatePayment({ orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.post<PaymentCreationResponse>('/payments/paygate', { orderId });
  },

  getPaymentStatus({ orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.get<PaymentStatusResponse>(`/payments/status/${orderId}`);
  },
};
