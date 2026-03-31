import { apiClient } from '@/services/api';
import type {
  CustomerAuthResponse,
  CustomerCredentials,
  CustomerProfileResponse,
  CustomerRegistration,
} from '@/types/auth';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const customerAuthService = {
  register(payload: CustomerRegistration) {
    return apiClient.post<CustomerAuthResponse>('/customers/register', {
      ...payload,
      name: payload.name.trim(),
      email: normalizeEmail(payload.email),
    });
  },

  login(payload: CustomerCredentials) {
    return apiClient.post<CustomerAuthResponse>('/customers/login', {
      ...payload,
      email: normalizeEmail(payload.email),
    });
  },

  profile(_accessToken?: string) {
    return apiClient.get<CustomerProfileResponse>('/customers/profile');
  },
};
