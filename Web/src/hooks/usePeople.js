import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: () => api.get('/people').then((r) => r.data),
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/people', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/people/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}
