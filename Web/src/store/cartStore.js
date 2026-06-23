import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      isActive: false,
      name: '',
      categoryId: '',
      paymentTypeId: '',
      accountId: '',
      items: [], // { id, name, amount }

      startCart: () => set({ isActive: true }),
      setField: (key, val) => set({ [key]: val }),

      addItem: (name, amount) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({ items: [...s.items, { id, name: name.trim(), amount: Number(amount) }] }));
      },

      updateItem: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      getTotal: () =>
        get().items.reduce((s, i) => s + Number(i.amount || 0), 0),

      clearCart: () =>
        set({ isActive: false, name: '', categoryId: '', paymentTypeId: '', accountId: '', items: [] }),
    }),
    { name: 'hk-cart-v1' }
  )
);
