import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { API_URL } from '../utils/constants';

const REFRESH_TOKEN_KEY = 'refresh_token';
const MIGRATION_TOKEN_KEY = 'legacy_access_token';
const PENDING_REVOCATION_KEY = 'pending_revocation';
const SECURE_STORAGE_PREFIX = 'skillbridge_auth_';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const SESSION_URL = `${API_URL}/auth/session`;

let accessToken = null;
let lastRefreshAt = 0;
let refreshInFlight = null;
let restoreInFlight = null;
let secureStorageReady;

export const isNativeAndroid = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

const prepareSecureStorage = async () => {
  if (!secureStorageReady) {
    secureStorageReady = SecureStorage.setKeyPrefix(SECURE_STORAGE_PREFIX);
  }
  await secureStorageReady;
};

const readSecureValue = async (key) => {
  await prepareSecureStorage();
  return SecureStorage.getItem(key);
};

const writeSecureValue = async (key, value) => {
  await prepareSecureStorage();
  await SecureStorage.setItem(key, value);
};

const removeSecureValue = async (key) => {
  await prepareSecureStorage();
  await SecureStorage.removeItem(key);
};

const clearLegacyWebAuth = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const requestSessionEndpoint = (action, data, token) => axios.post(
  `${SESSION_URL}/${action}`,
  data,
  {
    timeout: 15000,
    headers: {
      'X-Client-Platform': 'android',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }
);

const getResponseData = (response) => response.data?.data;

const saveSessionTokens = async (sessionData) => {
  if (
    typeof sessionData?.token !== 'string'
    || typeof sessionData?.refreshToken !== 'string'
  ) {
    throw new Error('The server did not return a secure Android session.');
  }

  await writeSecureValue(REFRESH_TOKEN_KEY, sessionData.refreshToken);
  await removeSecureValue(MIGRATION_TOKEN_KEY);
  accessToken = sessionData.token;
  lastRefreshAt = Date.now();
};

const isInvalidSession = (error) => (
  error.response?.status === 401 || error.response?.status === 403
);

const revokePendingToken = async () => {
  const pendingToken = await readSecureValue(PENDING_REVOCATION_KEY);
  if (!pendingToken) return;

  try {
    await requestSessionEndpoint('logout', { refreshToken: pendingToken });
    await removeSecureValue(PENDING_REVOCATION_KEY);
  } catch (error) {
    if (isInvalidSession(error)) {
      await removeSecureValue(PENDING_REVOCATION_KEY);
      return;
    }
    console.warn('A pending Android session revocation could not reach the server.');
  }
};

const getLegacyAccessToken = async () => {
  const securelyStoredToken = await readSecureValue(MIGRATION_TOKEN_KEY);
  if (securelyStoredToken) {
    clearLegacyWebAuth();
    return securelyStoredToken;
  }

  if (typeof window === 'undefined') return null;
  const legacyToken = sessionStorage.getItem('token') || localStorage.getItem('token');
  clearLegacyWebAuth();
  if (!legacyToken) return null;

  await writeSecureValue(MIGRATION_TOKEN_KEY, legacyToken);
  return legacyToken;
};

const expireNativeSession = async () => {
  accessToken = null;
  lastRefreshAt = 0;
  await removeSecureValue(REFRESH_TOKEN_KEY);
  await removeSecureValue(MIGRATION_TOKEN_KEY);
};

export const getNativeAccessToken = () => accessToken;

export const setNativeAccessToken = (token) => {
  accessToken = typeof token === 'string' ? token : null;
};

export const setNativeSession = async ({ token, refreshToken }) => {
  if (!isNativeAndroid()) return;
  await saveSessionTokens({ token, refreshToken });
  clearLegacyWebAuth();
};

const restoreNativeSessionImpl = async () => {
  if (!isNativeAndroid()) return null;

  await revokePendingToken();
  const migrationToken = await getLegacyAccessToken();
  if (migrationToken) {
    try {
      const response = await requestSessionEndpoint('migrate', {}, migrationToken);
      const sessionData = getResponseData(response);
      await saveSessionTokens(sessionData);
      return {
        token: sessionData.token,
        user: sessionData.user || sessionData.organisation
      };
    } catch (error) {
      if (isInvalidSession(error)) {
        await removeSecureValue(MIGRATION_TOKEN_KEY);
        return {
          token: null,
          user: null,
          notice: 'Your previous sign-in could not be restored. Please sign in again.'
        };
      }
      throw error;
    }
  }

  const refreshToken = await readSecureValue(REFRESH_TOKEN_KEY);
  if (!refreshToken) return { token: null, user: null };

  try {
    const response = await requestSessionEndpoint('refresh', { refreshToken });
    const sessionData = getResponseData(response);
    await saveSessionTokens(sessionData);
    return {
      token: sessionData.token,
      user: sessionData.user || sessionData.organisation
    };
  } catch (error) {
    if (isInvalidSession(error)) {
      await expireNativeSession();
      return {
        token: null,
        user: null,
        notice: 'Your saved sign-in has expired. Please sign in again.'
      };
    }
    throw error;
  }
};

export const restoreNativeSession = () => {
  if (!isNativeAndroid()) return Promise.resolve(null);
  if (restoreInFlight) return restoreInFlight;
  restoreInFlight = restoreNativeSessionImpl().finally(() => {
    restoreInFlight = null;
  });
  return restoreInFlight;
};

export const refreshNativeSession = ({ force = false } = {}) => {
  if (!isNativeAndroid()) return Promise.resolve(null);
  if (refreshInFlight) return refreshInFlight;
  if (!force && Date.now() - lastRefreshAt < REFRESH_INTERVAL_MS) {
    return Promise.resolve(accessToken);
  }

  refreshInFlight = (async () => {
    const refreshToken = await readSecureValue(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      accessToken = null;
      return null;
    }

    try {
      const response = await requestSessionEndpoint('refresh', { refreshToken });
      const sessionData = getResponseData(response);
      await saveSessionTokens(sessionData);
      return sessionData.token;
    } catch (error) {
      if (isInvalidSession(error)) {
        await expireNativeSession();
      }
      throw error;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
};

export const revokeNativeSession = async () => {
  if (!isNativeAndroid()) return { serverRevoked: true };

  let refreshToken = null;
  let serverRevoked = true;
  let revocationQueued = false;
  let localSessionCleared = true;

  try {
    refreshToken = await readSecureValue(REFRESH_TOKEN_KEY);
  } catch (error) {
    serverRevoked = false;
    console.error('Unable to read the Android session during sign-out:', error.message);
  }

  if (refreshToken) {
    try {
      await requestSessionEndpoint('logout', { refreshToken });
    } catch (error) {
      if (!isInvalidSession(error)) {
        serverRevoked = false;
        try {
          await writeSecureValue(PENDING_REVOCATION_KEY, refreshToken);
          revocationQueued = true;
        } catch (storageError) {
          console.error(
            'Unable to securely queue the Android session revocation:',
            storageError.message
          );
        }
      }
    }
  }

  accessToken = null;
  lastRefreshAt = 0;
  clearLegacyWebAuth();
  try {
    await Promise.all([
      removeSecureValue(REFRESH_TOKEN_KEY),
      removeSecureValue(MIGRATION_TOKEN_KEY)
    ]);
  } catch (error) {
    localSessionCleared = false;
    serverRevoked = false;
    console.error('Unable to clear the Android session from secure storage:', error.message);
  }

  return { serverRevoked, revocationQueued, localSessionCleared };
};

export const dispatchNativeSessionExpired = async () => {
  try {
    await expireNativeSession();
  } catch (error) {
    console.error('Unable to clear an expired Android session:', error.message);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('skillbridge:native-session-expired'));
  }
};
