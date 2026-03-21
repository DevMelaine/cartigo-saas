import { apiClient } from '@/services/api';
import type { PaymentCreationResponse, PaymentStatusResponse } from '@/types/payment';

type AuthenticatedOptions = {
  accessToken: string;
};

export const paymentService = {
  createPayGatePayment({ accessToken, orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.post<PaymentCreationResponse>(
      '/payments/paygate',
      { orderId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  },

  getPaymentStatus({ accessToken, orderId }: AuthenticatedOptions & { orderId: string }) {
    return apiClient.get<PaymentStatusResponse>(`/payments/status/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
