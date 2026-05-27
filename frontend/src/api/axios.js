import axios from 'axios';

const api = axios.create({
  baseURL: 'https://task-manager-api-8ai2.onrender.com',
  withCredentials: true,
});

export default api;