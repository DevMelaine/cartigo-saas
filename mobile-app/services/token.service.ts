import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CustomerSession } from '@/types/auth';

export const SESSION_STORAGE_KEY = 'cartigo.customer-session';
export const ACCESS_TOKEN_STORAGE_KEY = 'token';
export const REFRESH_TOKEN_STORAGE_KEY = 'cartigo.refresh-token';

const memoryStorage = new Map<string, string>();

async function readItem(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);

    if (value === null) {
      memoryStorage.delete(key);
      return null;
    }

    memoryStorage.set(key, value);
    return value;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

async function writeItem(key: string, value: string | null) {
  if (value === null) {
    memoryStorage.delete(key);

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      return;
    }

    return;
  }

  memoryStorage.set(key, value);

  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    return;
  }
}

async function patchStoredSession(patch: Partial<CustomerSession>) {
  const session = await getStoredSession();

  if (!session) {
    return;
  }

  const nextSession: CustomerSession = {
    ...session,
    ...patch,
    customer: patch.customer ?? session.customer,
    accessToken: patch.accessToken ?? session.accessToken,
    refreshToken: patch.refreshToken ?? session.refreshToken,
  };

  await writeItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
}

export async function getStoredSession() {
  const serializedSession = await readItem(SESSION_STORAGE_KEY);

  if (!serializedSession) {
    return null;
  }

  try {
    return JSON.parse(serializedSession) as CustomerSession;
  } catch {
    await writeItem(SESSION_STORAGE_KEY, null);
    return null;
  }
}

export async function saveCustomerSession(session: CustomerSession) {
  await Promise.all([
    writeItem(SESSION_STORAGE_KEY, JSON.stringify(session)),
    writeItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken),
    writeItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken),
  ]);
}

export async function updateCustomerSession(partialSession: Partial<CustomerSession>) {
  await patchStoredSession(partialSession);
}

export async function clearStoredSession() {
  await Promise.all([
    writeItem(SESSION_STORAGE_KEY, null),
    writeItem(ACCESS_TOKEN_STORAGE_KEY, null),
    writeItem(REFRESH_TOKEN_STORAGE_KEY, null),
  ]);
}

export async function getAccessToken() {
  return readItem(ACCESS_TOKEN_STORAGE_KEY);
}

export async function getRefreshToken() {
  return readItem(REFRESH_TOKEN_STORAGE_KEY);
}

export async function saveAccessToken(token: string) {
  await Promise.all([writeItem(ACCESS_TOKEN_STORAGE_KEY, token), patchStoredSession({ accessToken: token })]);
}

export async function saveRefreshToken(token: string) {
  await Promise.all([
    writeItem(REFRESH_TOKEN_STORAGE_KEY, token),
    patchStoredSession({ refreshToken: token }),
  ]);
}

export async function clearTokens() {
  await clearStoredSession();
}
