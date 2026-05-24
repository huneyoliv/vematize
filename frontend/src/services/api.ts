import axios, { AxiosInstance } from 'axios';
import mockApi from '../mocks/mockApi';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW_MODE === 'true';

let api: any;

if (IS_PREVIEW) {
  api = mockApi;
} else {
  const getBaseUrl = () => {
    const domain = import.meta.env.VITE_DOMAIN || 'localhost';
    if (domain === 'localhost') return '';
    return `https://api.${domain}`;
  };

  api = axios.create({ baseURL: getBaseUrl() });

  api.interceptors.request.use((config: any) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );
}

export default api as AxiosInstance;
