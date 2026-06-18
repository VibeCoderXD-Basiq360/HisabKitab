import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useSavingsGoal() {
  return useQuery({
    queryKey: ['savings-goal'],
    queryFn: () => api.get('/savings-goal').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpsertSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put('/savings-goal', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings-goal'] }),
  });
}

export function useDeleteSavingsGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/savings-goal'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings-goal'] }),
  });
}
