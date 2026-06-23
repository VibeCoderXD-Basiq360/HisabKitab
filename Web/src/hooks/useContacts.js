import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const KEY = 'contact-requests';

export function useContactRequests() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => api.get('/contacts/requests').then((r) => r.data),
    staleTime: 20_000,
  });
}

export function useSendContactRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email) => api.post('/contacts/request', { email }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAcceptContactRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/contacts/requests/${id}/accept`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['people'] });
    },
  });
}

export function useRejectContactRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/contacts/requests/${id}/reject`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
