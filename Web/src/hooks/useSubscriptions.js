import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useSubscriptions(params = {}) {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: () => api.get('/subscriptions', { params }).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/subscriptions', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/subscriptions/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/subscriptions/${id}/renew`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}
