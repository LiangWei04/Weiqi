import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const demoMode = import.meta.env.VITE_PUBLIC_DEMO === 'true';
const authStorage = demoMode ? sessionStorage : localStorage;

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const refreshAccessToken = async (): Promise<string> => {
  const token = authStorage.getItem('authToken');
  if (!token) {
    throw new Error('No token available');
  }
  return token;
};

apiClient.interceptors.request.use((config) => {
  const token = authStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (demoMode && ['post','put','delete'].includes(response.config.method || '') && !response.config.url?.startsWith('/demo/')) window.dispatchEvent(new Event('demo-updated'));
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!originalRequest) return Promise.reject(error);
    if (demoMode) {
      if (error.response?.status === 401 && !(originalRequest?.url === '/demo/session' && originalRequest?.method === 'post')) {
        authStorage.removeItem('authToken');
        window.location.assign('/login?expired=1');
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        authStorage.removeItem('authToken');
        authStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
