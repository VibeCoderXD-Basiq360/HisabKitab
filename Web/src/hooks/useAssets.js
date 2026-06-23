import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const KEY = 'assets';
const NW_KEY = 'net-worth';

export function useAssets() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => api.get('/assets').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useNetWorth() {
  return useQuery({
    queryKey: [NW_KEY],
    queryFn: () => api.get('/net-worth').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/assets', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [NW_KEY] }); },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/assets/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [NW_KEY] }); },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: [NW_KEY] }); },
  });
}
