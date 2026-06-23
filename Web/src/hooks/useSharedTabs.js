import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const KEY = 'shared-tabs';

export function useSharedTabs() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => api.get('/shared-tabs').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useSharedTab(id) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => api.get(`/shared-tabs/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/shared-tabs', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/shared-tabs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAcceptTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/shared-tabs/${id}/accept`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
  });
}

export function useDeclineTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/shared-tabs/${id}/decline`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAddEntry(tabId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/shared-tabs/${tabId}/entries`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, tabId] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useDeleteEntry(tabId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => api.delete(`/shared-tabs/${tabId}/entries/${entryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, tabId] });
      qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useUpdateEntry(tabId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...data }) => api.patch(`/shared-tabs/${tabId}/entries/${entryId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, tabId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useAddSettlement(tabId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/shared-tabs/${tabId}/settlements`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, tabId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteSettlement(tabId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settlementId) => api.delete(`/shared-tabs/${tabId}/settlements/${settlementId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, tabId] });
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
