import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export function usePinResetRequest() {
  return useMutation({
    mutationFn: () => api.post('/auth/pin-reset/request').then(r => r.data),
  });
}

export function usePinResetVerify() {
  return useMutation({
    mutationFn: (otp) => api.post('/auth/pin-reset/verify', { otp }).then(r => r.data),
  });
}
