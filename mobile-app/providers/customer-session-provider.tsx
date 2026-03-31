import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authService } from '@/services/auth.service';
import { customerAuthService } from '@/services/customer-auth.service';
import { clearStoredSession, getStoredSession, saveCustomerSession } from '@/services/token.service';
import type {
  Customer,
  CustomerCredentials,
  CustomerRegistration,
  CustomerSession,
} from '@/types/auth';

type CustomerSessionContextValue = {
  customer: Customer | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  login: (payload: CustomerCredentials) => Promise<CustomerSession>;
  register: (payload: CustomerRegistration) => Promise<CustomerSession>;
  logout: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const storedSession = await getStoredSession();

        if (!active || !storedSession) {
          return;
        }

        startTransition(() => {
          setSession(storedSession);
        });
      } catch {
        if (active) {
          await clearStoredSession();
        }
      } finally {
        if (active) {
          setIsHydrating(false);
        }
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribeRefresh = authService.subscribeToSessionRefresh((nextSession) => {
      startTransition(() => {
        setSession(nextSession);
      });
    });

    const unsubscribeFailure = authService.subscribeToAuthFailure(() => {
      startTransition(() => {
        setSession(null);
      });
    });

    return () => {
      unsubscribeRefresh();
      unsubscribeFailure();
    };
  }, []);

  async function applySession(nextSession: CustomerSession) {
    await saveCustomerSession(nextSession);
    startTransition(() => {
      setSession(nextSession);
    });
    return nextSession;
  }

  async function login(payload: CustomerCredentials) {
    setIsSubmitting(true);
    try {
      const response = await customerAuthService.login(payload);
      return applySession(response.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register(payload: CustomerRegistration) {
    setIsSubmitting(true);
    try {
      const response = await customerAuthService.register(payload);
      return applySession(response.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    setIsSubmitting(true);
    try {
      await clearStoredSession();
      startTransition(() => {
        setSession(null);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const value = useMemo<CustomerSessionContextValue>(
    () => ({
      customer: session?.customer ?? null,
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrating,
      isLoading: isHydrating,
      isSubmitting,
      login,
      register,
      logout,
    }),
    [isHydrating, isSubmitting, session]
  );

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession() {
  const value = useContext(CustomerSessionContext);

  if (!value) {
    throw new Error('useCustomerSession must be used within a CustomerSessionProvider.');
  }

  return value;
}
