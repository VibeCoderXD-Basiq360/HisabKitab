import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  jwt: localStorage.getItem('jwt') || null,
  user: null,
  profile: null,

  setAuth: (jwt, user) => {
    localStorage.setItem('jwt', jwt);
    set({ jwt, user });
  },

  setProfile: (profile) => set({ profile }),

  logout: () => {
    localStorage.removeItem('jwt');
    set({ jwt: null, user: null, profile: null });
  },
}));
