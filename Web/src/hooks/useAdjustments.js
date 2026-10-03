import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { ACCOUNTS_KEY } from './useAccounts.js';

export function useAdjustments(accountId) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, accountId, 'adjustments'],
    queryFn: () => api('GET', `/accounts/${accountId}/adjustments`),
  });
}

export function useCreateAdjustment(accountId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (adjustment) => api('POST', `/accounts/${accountId}/adjustments`, adjustment),
    // An adjustment moves the balance everywhere it's shown: the list, the
    // account, its ledger. All of them sit under the accounts key.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}
