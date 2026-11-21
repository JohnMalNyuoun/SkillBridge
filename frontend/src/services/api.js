import axios from 'axios';
import { API_URL } from '../utils/constants';
import {
  dispatchNativeSessionExpired,
  getNativeAccessToken,
  isNativeAndroid,
  refreshNativeSession
} from './nativeAuthSession';

const api = axios.create({
  baseURL: API_URL
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers?.['Content-Type']) {
      delete config.headers['Content-Type'];
    }
  } else {
    config.headers = config.headers || {};
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  config.headers = config.headers || {};
  const nativeAndroid = isNativeAndroid();
  const token = nativeAndroid
    ? getNativeAccessToken()
    : sessionStorage.getItem('token') || localStorage.getItem('token');
  if (nativeAndroid) {
    config.headers['X-Client-Platform'] = 'android';
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiry without hijacking normal login/register 401s.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/');
    const hadToken = Boolean(
      error.config?.headers?.Authorization || error.config?.headers?.authorization
    );

    if (status === 401 && hadToken && isNativeAndroid()) {
      const requestConfig = error.config;
      const isCredentialEndpoint = /\/auth\/(?:youth\/(?:login|register)|org\/(?:login|register)|google(?:\/|$)|verification\/)/.test(url);
      if (isCredentialEndpoint) return Promise.reject(error);
      if (requestConfig.__nativeSessionRetried) {
        await dispatchNativeSessionExpired();
        return Promise.reject(error);
      }

      requestConfig.__nativeSessionRetried = true;
      try {
        const token = await refreshNativeSession({ force: true });
        if (!token) {
          await dispatchNativeSessionExpired();
          return Promise.reject(error);
        }
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers.Authorization = `Bearer ${token}`;
        return api.request(requestConfig);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError.response?.status)) {
          await dispatchNativeSessionExpired();
        }
        return Promise.reject(error);
      }
    }

    if (status === 401 && hadToken && !isAuthEndpoint) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
