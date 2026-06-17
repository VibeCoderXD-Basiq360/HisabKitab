import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useRecurring() {
  return useQuery({
    queryKey: ['recurring'],
    queryFn: () => api.get('/recurring').then((r) => r.data),
  });
}

export function useToggleRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/recurring/${id}`, { isActive }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useEditSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nextDueDate, endDate }) =>
      api.patch(`/recurring/${id}`, { nextDueDate, endDate }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}
