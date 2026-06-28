export type CustomerCredentials = {
  email: string;
  password: string;
};

export type CustomerRegistration = CustomerCredentials & {
  name: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
};

export type CustomerSession = {
  customer: Customer;
  accessToken: string;
  refreshToken: string;
};

export type CustomerAuthResponse = {
  success: boolean;
  data: CustomerSession;
};

export type CustomerProfileResponse = {
  success: boolean;
  data: Customer;
};
