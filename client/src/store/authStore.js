import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, tokens } = response.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    set({ user, isAuthenticated: true });
    return response.data;
  },

  register: async (data) => {
    const response = await api.post('/auth/register', data);
    const { user, tokens } = response.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    
    set({ user, isAuthenticated: true });
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, organization: null, isAuthenticated: false });
    }
  },

  fetchCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data.user,
        organization: response.data.organization,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // If token is invalid or expired, clear auth state
      console.error('Failed to fetch current user:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, organization: null, isAuthenticated: false, isLoading: false });
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && 
          window.location.pathname !== '/register' && 
          window.location.pathname !== '/forgot-password') {
        window.location.href = '/login';
      }
    }
  },

  updateUser: (user) => set({ user }),
  updateOrganization: (organization) => set({ organization }),
}));

export default useAuthStore;
