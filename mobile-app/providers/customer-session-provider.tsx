import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { customerAuthService } from '@/services/customer-auth.service';
import type {
  Customer,
  CustomerCredentials,
  CustomerRegistration,
  CustomerSession,
} from '@/types/auth';

const SESSION_STORAGE_KEY = 'cartigo.customer-session';
export const AUTH_TOKEN_STORAGE_KEY = 'token';

let memorySessionStore: string | null = null;

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

async function readStoredSession() {
  try {
    const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (stored) {
      memorySessionStore = stored;
    }

    return stored;
  } catch {
    return memorySessionStore;
  }
}

async function persistSession(session: CustomerSession | null) {
  if (!session) {
    memorySessionStore = null;

    try {
      await Promise.all([
        AsyncStorage.removeItem(SESSION_STORAGE_KEY),
        AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY),
      ]);
    } catch {
      return;
    }

    return;
  }

  const serializedSession = JSON.stringify(session);
  memorySessionStore = serializedSession;

  try {
    await Promise.all([
      AsyncStorage.setItem(SESSION_STORAGE_KEY, serializedSession),
      AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.accessToken),
    ]);
  } catch {
    return;
  }
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const stored = await readStoredSession();

        if (!active || !stored) {
          return;
        }

        const parsed = JSON.parse(stored) as CustomerSession;
        startTransition(() => {
          setSession(parsed);
        });
      } catch {
        if (active) {
          await persistSession(null);
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

  async function applySession(nextSession: CustomerSession) {
    await persistSession(nextSession);
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
      await persistSession(null);
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
