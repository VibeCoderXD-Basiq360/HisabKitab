import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ── Business ──────────────────────────────────────────────────────────────────
export const useBusiness = () =>
  useQuery({ queryKey: ['business'], queryFn: () => api.get('/business').then(r => r.data), retry: false });

export const useCreateBusiness = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }) });
};

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.put('/business/settings', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }) });
};

export const useAddLocation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business/locations', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }) });
};

export const useInvitePartner = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business/partners/invite', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }) });
};

export const useUpdatePartner = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.patch(`/business/partners/${id}`, d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business'] }) });
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const useInventoryItems = () =>
  useQuery({ queryKey: ['inventory-items'], queryFn: () => api.get('/inventory/items').then(r => r.data) });

export const useCreateItem = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/inventory/items', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }) });
};

export const useUpdateItem = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/inventory/items/${id}`, d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }) });
};

export const useAddStock = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/inventory/stock/add', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }) });
};

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/inventory/stock/adjust', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }) });
};

export const useTransferStock = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/inventory/stock/transfer', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-items'] }) });
};

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const useJobs = (params = {}) =>
  useQuery({ queryKey: ['business-jobs', params],
    queryFn: () => api.get('/business-jobs', { params }).then(r => r.data) });

export const useJob = (id) =>
  useQuery({ queryKey: ['business-jobs', id],
    queryFn: () => api.get(`/business-jobs/${id}`).then(r => r.data), enabled: !!id });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business-jobs', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business-jobs'] }); qc.invalidateQueries({ queryKey: ['inventory-items'] }); } });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.patch(`/business-jobs/${id}`, d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-jobs'] }) });
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const useCustomers = () =>
  useQuery({ queryKey: ['business-customers'], queryFn: () => api.get('/business-customers').then(r => r.data) });

export const useCustomer = (id) =>
  useQuery({ queryKey: ['business-customers', id], queryFn: () => api.get(`/business-customers/${id}`).then(r => r.data), enabled: !!id });

export const useCustomerDetail = (id) =>
  useQuery({ queryKey: ['business-customers-detail', id], queryFn: () => api.get(`/business-customers/${id}`).then(r => r.data), enabled: !!id });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business-customers', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-customers'] }) });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/business-customers/${id}`, d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-customers'] }) });
};

// ── Expenses ─────────────────────────────────────────────────────────────────
export const useBusinessExpenses = (params = {}) =>
  useQuery({ queryKey: ['business-expenses', params],
    queryFn: () => api.get('/business-expenses', { params }).then(r => r.data) });

// auth-only — safe to call from any page; returns [] if user has no business
export const useBusinessExpensesFeed = (params = {}) =>
  useQuery({ queryKey: ['business-expenses-feed', params],
    queryFn: () => api.get('/business-expenses/feed', { params }).then(r => r.data),
    retry: false });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business-expenses', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-expenses'] }) });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: id => api.delete(`/business-expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-expenses'] }) });
};

export const useWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: d => api.post('/business-expenses/withdrawals', d).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-pl'] }) });
};

// ── P&L ──────────────────────────────────────────────────────────────────────
export const useBusinessPL = (params = {}) =>
  useQuery({ queryKey: ['business-pl', params],
    queryFn: () => api.get('/business-pl', { params }).then(r => r.data) });
