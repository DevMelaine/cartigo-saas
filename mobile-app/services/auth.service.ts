import axios from 'axios';

import { APP_CONFIG } from '@/constants/app';
import type { CustomerSession } from '@/types/auth';

type AuthStateListener = () => void;
type SessionRefreshListener = (session: CustomerSession) => void;

type RefreshResponse = {
  success: boolean;
  data: CustomerSession;
};

const refreshClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const authFailureListeners = new Set<AuthStateListener>();
const sessionRefreshListeners = new Set<SessionRefreshListener>();

export const authService = {
  async refreshCustomerSession(refreshToken: string) {
    const response = await refreshClient.post<RefreshResponse>('/customers/refresh-token', {
      refreshToken,
    });

    return response.data.data;
  },

  subscribeToAuthFailure(listener: AuthStateListener) {
    authFailureListeners.add(listener);

    return () => {
      authFailureListeners.delete(listener);
    };
  },

  notifyAuthFailure() {
    authFailureListeners.forEach((listener) => {
      listener();
    });
  },

  subscribeToSessionRefresh(listener: SessionRefreshListener) {
    sessionRefreshListeners.add(listener);

    return () => {
      sessionRefreshListeners.delete(listener);
    };
  },

  notifySessionRefresh(session: CustomerSession) {
    sessionRefreshListeners.forEach((listener) => {
      listener(session);
    });
  },
};
