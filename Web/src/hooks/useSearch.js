import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useSearch(q) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get('/search', { params: { q } }).then((r) => r.data),
    enabled: !!q && q.trim().length >= 2,
    staleTime: 30_000,
  });
}
