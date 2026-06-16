import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: () => api.get('/splits/balances').then((r) => r.data),
  });
}

export function useRequestPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId, note }) =>
      api.post(`/splits/${splitId}/pay`, { note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['balances'] }),
  });
}

export function useAcceptPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/accept`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/reject`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['balances'] }),
  });
}
