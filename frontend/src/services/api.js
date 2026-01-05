import axios from 'axios';
import { store } from '../redux/store';
import { logout } from '../redux/slices/authSlice';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ IMPROVED: Handle response errors properly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.message || '';
      
      // Only redirect if it's a token expiry issue, not wrong credentials
      if (
        errorMessage.includes('expired') || 
        errorMessage.includes('Session expired') ||
        errorMessage.includes('Not authorized') ||
        errorMessage.includes('Invalid token') ||
        error.response.data?.expired === true
      ) {
        // Clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Dispatch logout
        store.dispatch(logout());
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;