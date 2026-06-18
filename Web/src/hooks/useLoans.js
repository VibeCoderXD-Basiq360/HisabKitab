import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: () => api.get('/loans').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useLoan(id) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => api.get(`/loans/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/loans', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/loans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useMarkEMIPaid(loanId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, note }) => api.post(`/loans/${loanId}/payments/${month}`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans', loanId] }),
  });
}

export function useMarkEMIUnpaid(loanId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month) => api.delete(`/loans/${loanId}/payments/${month}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans', loanId] }),
  });
}
