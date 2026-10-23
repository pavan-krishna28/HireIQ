import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hireiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('hireiq_token');
      localStorage.removeItem('hireiq_recruiter');
      if (!window.location.pathname.includes('/login')) window.location.href = '/recruiter/login';
    }
    return Promise.reject(err);
  }
);

export default api;
