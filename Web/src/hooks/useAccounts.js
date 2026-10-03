import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

// Everything about accounts sits under this key, so one invalidation
// refreshes every balance and ledger that a change could have moved.
const ACCOUNTS_KEY = ['accounts'];

export function useAccounts() {
  return useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => api('GET', '/accounts') });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account) => api('POST', '/accounts', account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}
