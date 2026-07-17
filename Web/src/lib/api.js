import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const jwt = localStorage.getItem('jwt');
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
  config._t = performance.now();
  return config;
});

api.interceptors.response.use(
  (res) => {
    const ms = Math.round(performance.now() - (res.config._t || 0));
    window.dispatchEvent(new CustomEvent('api:timing', {
      detail: { method: res.config.method?.toUpperCase(), url: res.config.url, status: res.status, ms, ok: true },
    }));
    return res;
  },
  (err) => {
    if (err.config?._t) {
      const ms = Math.round(performance.now() - err.config._t);
      window.dispatchEvent(new CustomEvent('api:timing', {
        detail: { method: err.config.method?.toUpperCase(), url: err.config.url, status: err.response?.status ?? 0, ms, ok: false },
      }));
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('jwt');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
