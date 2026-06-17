import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then((r) => r.data),
  });
}

export function useGroup(id) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/groups', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useAddGroupExpense(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/groups/${groupId}/expenses`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteGroupExpense(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eid) => api.delete(`/groups/${groupId}/expenses/${eid}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useRecordSettlement(groupId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/groups/${groupId}/settlements`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] }),
  });
}

export function useSearchUsers(q) {
  return useQuery({
    queryKey: ['group-user-search', q],
    queryFn: () => api.get('/groups/search-users', { params: { q } }).then((r) => r.data),
    enabled: q.length >= 2,
  });
}
