import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('jwt');
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jwt');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
