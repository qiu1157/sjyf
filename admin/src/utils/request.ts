import axios from 'axios';
import { message } from 'antd';

// 管理端生产环境依赖 Nginx 同源代理到 /api，避免在代码里写死服务器地址。
const request = axios.create({ baseURL: '/api', timeout: 15000 });

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (res) => {
    const data = res.data;
    if (data.code === 0) return data.data;
    message.error(data.message || '请求失败');
    return Promise.reject(data);
  },
  (err) => {
    const status = err.response?.status;
    if (status === 401) {
      message.error('登录已过期，请重新登录');
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    } else {
      message.error(err.response?.data?.message || err.message);
    }
    return Promise.reject(err);
  }
);

export default request;
