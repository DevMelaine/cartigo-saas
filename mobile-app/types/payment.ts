export type PaymentCreationResponse = {
  success: boolean;
  paymentUrl: string;
};

export type PaymentStatusData = {
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  txReference: string;
  paymentReference?: string | null;
  method?: string | null;
  providerStatusCode: number;
};

export type PaymentStatusResponse = {
  success: boolean;
  data: PaymentStatusData;
};
