import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLockStore = create(
  persist(
    (set) => ({
      enabled:          false,
      lockType:         'pin',    // 'pin' | 'password'
      pinHash:          null,
      locked:           false,
      biometricEnabled: false,
      biometricCredId:  null,     // number[] — rawId from WebAuthn credential
      failedAttempts:   0,
      lockedUntil:      null,     // epoch ms

      setEnabled:        (v)           => set({ enabled: v }),
      setLockType:       (t)           => set({ lockType: t }),
      setPinHash:        (h)           => set({ pinHash: h }),
      setLocked:         (v)           => set({ locked: v }),
      setBiometric:      (enabled, id) => set({ biometricEnabled: enabled, biometricCredId: id }),
      incFailedAttempts: ()            => set((s) => {
        const next = s.failedAttempts + 1;
        const cooldown = next >= 10 ? 30 * 60       // 30 min after 10+
                       : next >= 7  ? 5 * 60        // 5 min after 7+
                       : next >= 5  ? 60            // 60s after 5+
                       : next >= 3  ? 30            // 30s after 3+
                       : 0;
        return {
          failedAttempts: next,
          lockedUntil: cooldown > 0 ? Date.now() + cooldown * 1000 : s.lockedUntil,
        };
      }),
      resetAttempts: () => set({ failedAttempts: 0, lockedUntil: null }),
    }),
    {
      name: 'hk-lock',
      // never persist the transient locked state across sessions —
      // StartupLock in App.jsx re-locks on every fresh open
      partialize: (s) => ({
        enabled:          s.enabled,
        lockType:         s.lockType,
        pinHash:          s.pinHash,
        biometricEnabled: s.biometricEnabled,
        biometricCredId:  s.biometricCredId,
        // failedAttempts + lockedUntil DO persist so a cooldown survives a reload
        failedAttempts:   s.failedAttempts,
        lockedUntil:      s.lockedUntil,
      }),
    }
  )
);
