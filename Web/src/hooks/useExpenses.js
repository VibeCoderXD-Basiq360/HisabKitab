import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useExpenses(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => api.get('/expenses', { params: filters }).then((r) => r.data),
    ...options,
  });
}

export function useExpense(id) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => api.get(`/expenses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/expenses', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/expenses/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useAnalytics(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', params],
    queryFn: () => api.get('/expenses/analytics', { params }).then((r) => r.data),
    ...options,
  });
}

export function useTrend() {
  return useQuery({
    queryKey: ['analytics-trend'],
    queryFn: () => api.get('/expenses/analytics/trend').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
