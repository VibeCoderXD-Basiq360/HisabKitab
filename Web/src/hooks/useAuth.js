import { useAuthStore } from '../store/authStore';

export function useIsAuthenticated() {
  return !!useAuthStore((s) => s.jwt);
}

export function useCurrentUser() {
  return useAuthStore((s) => s.profile || s.user);
}
