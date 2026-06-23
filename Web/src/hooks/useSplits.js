import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: () => api.get('/splits/balances').then((r) => r.data),
  });
}

export function usePaidForSummary() {
  return useQuery({
    queryKey: ['paidForSummary'],
    queryFn: () => api.get('/splits/paid-for').then((r) => r.data),
  });
}

export function usePaidForPerson(personId) {
  return useQuery({
    queryKey: ['paidForPerson', personId],
    queryFn: () => api.get(`/splits/paid-for/${personId}`).then((r) => r.data),
    enabled: !!personId,
  });
}

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ['balances'] });
  qc.invalidateQueries({ queryKey: ['paidForSummary'] });
  qc.invalidateQueries({ queryKey: ['paidForPerson'] });
}

export function useRequestPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId, note }) =>
      api.post(`/splits/${splitId}/pay`, { note }).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useAcceptPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/accept`).then((r) => r.data),
    onSuccess: () => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/reject`).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/mark-received`).then((r) => r.data),
    onSuccess: () => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useWaiveSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId) => api.post(`/splits/${splitId}/waive`).then((r) => r.data),
    onSuccess: () => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useMarkAllReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId) => api.post(`/splits/settle-all/${personId}`).then((r) => r.data),
    onSuccess: () => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
