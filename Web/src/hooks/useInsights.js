import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: () => api.get('/insights').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
