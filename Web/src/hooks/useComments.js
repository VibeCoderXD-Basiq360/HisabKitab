import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useComments(expenseId) {
  return useQuery({
    queryKey: ['comments', expenseId],
    queryFn: () => api.get(`/expenses/${expenseId}/comments`).then((r) => r.data),
    enabled: !!expenseId,
  });
}

export function useAddComment(expenseId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => api.post(`/expenses/${expenseId}/comments`, { text }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', expenseId] }),
  });
}

export function useDeleteComment(expenseId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => api.delete(`/expenses/${expenseId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', expenseId] }),
  });
}

export function useExpenseTags() {
  return useQuery({
    queryKey: ['expense-tags'],
    queryFn: () => api.get('/expenses/tags').then((r) => r.data),
    staleTime: 60_000,
  });
}
