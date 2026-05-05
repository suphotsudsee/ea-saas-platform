import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: Array<{
    path?: Array<string | number>;
    message?: string;
  }>;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const payload = error.response?.data;
  const validationDetails = payload?.details
    ?.map((detail) => {
      const field = detail.path?.join('.');
      return [field, detail.message].filter(Boolean).join(': ');
    })
    .filter(Boolean);

  if (validationDetails?.length) {
    return `Invalid input: ${validationDetails.join(', ')}`;
  }

  if (payload?.error === 'Validation failed') {
    return 'The information you entered is not valid. Please check your details and try again.';
  }

  return payload?.error || payload?.message || error.message || fallback;
}

<<<<<<< HEAD
// Auth Interceptor
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
=======
// Auth Interceptor — only attach token when it exists
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
>>>>>>> cba4206f46728294b317464c4728579d35ff872d

// Error Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config ?? {}) as RetryableAxiosRequestConfig;
    const requestUrl = originalRequest.url ?? '';
    const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register') || requestUrl.includes('/auth/me');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`);
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        if (typeof window !== 'undefined') {
          const authPages = ['/login', '/register', '/forgot-password'];
          if (!authPages.includes(window.location.pathname)) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;