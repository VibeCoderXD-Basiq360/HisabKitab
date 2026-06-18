import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLockStore = create(
  persist(
    (set) => ({
      enabled: false,
      pinHash: null,
      locked: false,
      biometricEnabled: false,
      biometricCredId: null, // number[] — rawId from WebAuthn credential
      setEnabled: (v) => set({ enabled: v }),
      setPinHash: (h) => set({ pinHash: h }),
      setLocked: (v) => set({ locked: v }),
      setBiometric: (enabled, credId) => set({ biometricEnabled: enabled, biometricCredId: credId }),
    }),
    { name: 'hk-lock' }
  )
);
