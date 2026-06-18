import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => api.get('/exchange-rates').then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

// Returns a lookup map: { THB: 2.30, USD: 83.50, ... }
export function useRateMap() {
  const { data = [] } = useExchangeRates();
  return Object.fromEntries(data.map((r) => [r.fromCurrency, Number(r.rate)]));
}

export function useUpdateRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, rate }) => api.put(`/exchange-rates/${from}`, { rate }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exchange-rates'] }),
  });
}

export function useRefreshRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/exchange-rates/refresh').then((r) => r.data),
    onSuccess: (data) => {
      // Server returns { rates, source, date } — update cache directly
      if (data?.rates) {
        qc.setQueryData(['exchange-rates'], data.rates);
      } else {
        qc.invalidateQueries({ queryKey: ['exchange-rates'] });
      }
    },
  });
}
