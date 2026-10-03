import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export const CURRENT_USER_KEY = ['auth', 'me'];

// Logged out is an answer, not an error: /auth/me's 401 becomes null.
async function fetchCurrentUser() {
  try {
    return await api('GET', '/auth/me');
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

export function useCurrentUser() {
  // Never refetched on its own. When a session ends, any request's 401
  // clears it (see main.jsx), which sends the person to the login screen.
  return useQuery({ queryKey: CURRENT_USER_KEY, queryFn: fetchCurrentUser, staleTime: Infinity });
}

function startSignedInSession(queryClient, user) {
  // Someone else may have used this browser before. Never show their data.
  queryClient.clear();
  queryClient.setQueryData(CURRENT_USER_KEY, user);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }) => api('POST', '/auth/login', { email, password }),
    onSuccess: (user) => startSignedInSession(queryClient, user),
  });
}

// The backend's register does not log in, so this logs in straight after.
export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password, displayName }) => {
      await api('POST', '/auth/register', { email, password, displayName });
      return api('POST', '/auth/login', { email, password });
    },
    onSuccess: (user) => startSignedInSession(queryClient, user),
  });
}
