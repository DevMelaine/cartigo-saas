import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = '5001';
const DEFAULT_API_PATH = '/api';

function normalizeUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function extractHost(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0] ?? null;
}

function getExpoHost() {
  const expoConfig = Constants.expoConfig as { hostUri?: string | null } | null;
  const expoGoConfig = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string | null };
    manifest2?: {
      extra?: {
        expoClient?: {
          hostUri?: string | null;
        };
      };
    };
  };

  return (
    extractHost(expoConfig?.hostUri) ??
    extractHost(expoGoConfig.expoGoConfig?.debuggerHost) ??
    extractHost(expoGoConfig.manifest2?.extra?.expoClient?.hostUri) ??
    null
  );
}

function getRuntimeHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }

  return getExpoHost() ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
}

function resolveApiBaseUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (explicitUrl) {
    return normalizeUrl(explicitUrl);
  }

  return `http://${getRuntimeHost()}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
}

export const APP_CONFIG = {
  name: 'Cartigo',
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  apiBaseUrl: resolveApiBaseUrl(),
};
