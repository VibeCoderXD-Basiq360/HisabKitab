import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useBudgets() {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets').then((r) => r.data),
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, amount }) =>
      api.put(`/budgets/${categoryId}`, { amount }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
