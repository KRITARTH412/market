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
      set({ user: null, organization: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (user) => set({ user }),
  updateOrganization: (organization) => set({ organization }),
}));

export default useAuthStore;
