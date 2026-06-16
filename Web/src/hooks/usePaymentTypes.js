import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function usePaymentTypes() {
  return useQuery({
    queryKey: ['paymentTypes'],
    queryFn: () => api.get('/payment-types').then((r) => r.data),
  });
}

export function useCreatePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/payment-types', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paymentTypes'] }),
  });
}

export function useUpdatePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/payment-types/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paymentTypes'] }),
  });
}

export function useDeletePaymentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/payment-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paymentTypes'] }),
  });
}
