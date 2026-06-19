import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import api from '../lib/api';

export function useBiometricSupported() {
  return useQuery({
    queryKey: ['biometricSupported'],
    queryFn: async () => {
      if (typeof PublicKeyCredential === 'undefined') return false;
      return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    },
    staleTime: Infinity,
  });
}

export function useWebAuthnCredentials() {
  return useQuery({
    queryKey: ['webauthnCredentials'],
    queryFn: () => api.get('/auth/webauthn/credentials').then((r) => r.data),
  });
}

export function useRegisterBiometric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceName) => {
      const options = await api.get('/auth/webauthn/register-options').then((r) => r.data);
      const attestation = await startRegistration({ optionsJSON: options });
      await api.post('/auth/webauthn/register-verify', { response: attestation, deviceName });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webauthnCredentials'] }),
  });
}

export function useAuthenticateBiometric() {
  return useMutation({
    mutationFn: async () => {
      const options = await api.get('/auth/webauthn/authenticate-options').then((r) => r.data);
      const assertion = await startAuthentication({ optionsJSON: options });
      return api.post('/auth/webauthn/authenticate-verify', { response: assertion }).then((r) => r.data);
    },
  });
}

export function useFirebaseActionToken() {
  return useMutation({
    mutationFn: (firebaseToken) =>
      api.post('/auth/webauthn/firebase-action-token', { firebaseToken }).then((r) => r.data),
  });
}

export function useRemoveBiometric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/auth/webauthn/credentials/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webauthnCredentials'] }),
  });
}
