import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useCardDelegations() {
  return useQuery({
    queryKey: ['cardDelegations'],
    queryFn: () => api.get('/card-delegations').then((r) => r.data),
  });
}

export function useCardDelegationBalance() {
  return useQuery({
    queryKey: ['cardDelegationBalance'],
    queryFn: () => api.get('/card-delegations/balance').then((r) => r.data),
  });
}

export function useDelegationExpenses(delegationId) {
  return useQuery({
    queryKey: ['delegationExpenses', delegationId],
    queryFn: () => api.get(`/card-delegations/${delegationId}/expenses`).then((r) => r.data),
    enabled: !!delegationId,
  });
}

function actionHeaders(token) {
  return token ? { headers: { 'x-action-token': token } } : {};
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ _actionToken, ...data }) =>
      api.post('/card-delegations', data, actionHeaders(_actionToken)).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardDelegations'] }),
  });
}

export function useApproveDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, _actionToken }) =>
      api.post(`/card-delegations/${id}/approve`, {}, actionHeaders(_actionToken)).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardDelegations'] }),
  });
}

export function useRejectDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/card-delegations/${id}/reject`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardDelegations'] }),
  });
}

export function useRevokeDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/card-delegations/${id}/revoke`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardDelegations'] }),
  });
}

export function useCreateRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ delegationId, ...data }) =>
      api.post(`/card-delegations/${delegationId}/repayments`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardDelegationBalance'] });
      qc.invalidateQueries({ queryKey: ['cardDelegations'] });
    },
  });
}

export function useApproveRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ delegationId, repaymentId }) =>
      api.post(`/card-delegations/${delegationId}/repayments/${repaymentId}/approve`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardDelegationBalance'] });
      qc.invalidateQueries({ queryKey: ['delegationExpenses'] });
    },
  });
}

export function useRejectRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ delegationId, repaymentId }) =>
      api.post(`/card-delegations/${delegationId}/repayments/${repaymentId}/reject`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cardDelegationBalance'] }),
  });
}

export function useToggleWillRepay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expenseId) =>
      api.patch(`/card-delegations/expenses/${expenseId}/toggle-repay`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardDelegationBalance'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useLinkOwnerCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ delegationId, ownerPaymentTypeId, _actionToken }) =>
      api.patch(
        `/card-delegations/${delegationId}/link-owner-card`,
        { ownerPaymentTypeId },
        actionHeaders(_actionToken),
      ).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cardDelegations'] });
      qc.invalidateQueries({ queryKey: ['combinedBill'] });
    },
  });
}

export function useCombinedBill(delegationId) {
  return useQuery({
    queryKey: ['combinedBill', delegationId],
    queryFn: () => api.get(`/card-delegations/${delegationId}/combined-bill`).then((r) => r.data),
    enabled: !!delegationId,
  });
}
