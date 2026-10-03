import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

// Everything about accounts sits under this key — the list, each account,
// its ledger, its adjustments — so one invalidation refreshes every balance
// and ledger that a change could have moved.
export const ACCOUNTS_KEY = ['accounts'];

export function useAccounts() {
  return useQuery({ queryKey: ACCOUNTS_KEY, queryFn: () => api('GET', '/accounts') });
}

export function useAccount(accountId) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, accountId],
    queryFn: () => api('GET', `/accounts/${accountId}`),
  });
}

// The ledger comes 50 rows at a time; each "Show more" asks for the next page.
export function useLedger(accountId) {
  return useInfiniteQuery({
    queryKey: [...ACCOUNTS_KEY, accountId, 'ledger'],
    queryFn: ({ pageParam }) => api('GET', `/accounts/${accountId}/ledger?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account) => api('POST', '/accounts', account),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}
