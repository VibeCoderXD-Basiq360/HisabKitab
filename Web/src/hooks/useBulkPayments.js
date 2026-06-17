import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useBulkPayments() {
  return useQuery({
    queryKey: ['bulk-payments'],
    queryFn: async () => {
      const { data } = await api.get('/bulk-payments');
      return data;
    },
  });
}

export function useCreateBulkPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post('/bulk-payments', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulk-payments'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['splits'] });
    },
  });
}

export function useRespondBulkPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => api.patch(`/bulk-payments/${id}/respond`, { action }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulk-payments'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['splits'] });
    },
  });
}

export function useCancelBulkPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/bulk-payments/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulk-payments'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['splits'] });
    },
  });
}
