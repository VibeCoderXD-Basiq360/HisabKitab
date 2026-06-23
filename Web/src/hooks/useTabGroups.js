import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const KEY = 'tab-groups';

export function useTabGroups() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => api.get('/tab-groups').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useTabGroup(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/tab-groups/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateTabGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/tab-groups', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAcceptTabGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/tab-groups/${id}/accept`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['shared-tabs'] });
    },
  });
}

export function useDeclineTabGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/tab-groups/${id}/decline`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useNewMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => api.post(`/tab-groups/${groupId}/new-month`).then((r) => r.data),
    onSuccess: (_, groupId) => {
      qc.invalidateQueries({ queryKey: [KEY, groupId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['shared-tabs'] });
    },
  });
}

export function useDeleteTabGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/tab-groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
