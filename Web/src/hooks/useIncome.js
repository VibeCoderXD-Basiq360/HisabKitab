import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useIncome(params = {}) {
  return useQuery({
    queryKey: ['income', params],
    queryFn: () => api.get('/income', { params }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useIncomeSummary(params = {}) {
  return useQuery({
    queryKey: ['income-summary', params],
    queryFn: () => api.get('/income/summary', { params }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/income', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/income/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/income/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income'] }),
  });
}
