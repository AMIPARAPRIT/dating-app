import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://dating-app-tj63.onrender.com';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
