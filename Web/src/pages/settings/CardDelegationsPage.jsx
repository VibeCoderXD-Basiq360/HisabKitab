import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import VerifyIdentitySheet from '../../components/VerifyIdentitySheet';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import {
  useCardDelegations,
  useCardDelegationBalance,
  useApproveDelegation,
  useRejectDelegation,
  useRevokeDelegation,
  useCreateRepayment,
  useApproveRepayment,
  useRejectRepayment,
  useDelegationExpenses,
  useLinkOwnerCard,
  useCombinedBill,
} from '../../hooks/useCardDelegation';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => format(new Date(d), 'd MMM yyyy');

// ─── Repay sheet ──────────────────────────────────────────────────────────────
function RepaySheet({ delegationId, expenses, onClose, onSubmit, isPending }) {
  const [selected, setSelected] = useState(new Set());
  const [note, setNote] = useState('');

  const toggle = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const total = expenses.filter((e) => selected.has(e.id)).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>Select expenses to repay</h2>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {expenses.map((e) => (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                border: selected.has(e.id) ? '1.5px solid #00C2B2' : '1.5px solid #E5E7EB',
                background: selected.has(e.id) ? '#E6FAF9' : '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: selected.has(e.id) ? '2px solid #00C2B2' : '2px solid #D1D5DB',
                background: selected.has(e.id) ? '#00C2B2' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {selected.has(e.id) && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#0A0D14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || 'Expense'}</p>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{fmtDate(e.expenseDate)}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', flexShrink: 0 }}>{fmt(e.amount)}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 13, color: '#0A0D14', outline: 'none' }}
        />
        <button
          disabled={selected.size === 0 || isPending}
          onClick={() => onSubmit({ delegationId, expenseIds: [...selected], note })}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: selected.size === 0 || isPending ? 'not-allowed' : 'pointer',
            opacity: selected.size === 0 || isPending ? 0.5 : 1,
          }}
        >
          {isPending ? 'Sending…' : `Mark ${fmt(total)} as paid`}
        </button>
      </div>
    </div>
  );
}

// ─── Owner expenses + repayment review ────────────────────────────────────────
function OwnerExpensesSheet({ delegationId, personName, onClose, onApprove, onReject, repayments, approveIsPending, rejectIsPending }) {
  const { t } = useTranslation();
  const { data: expenses = [], isLoading } = useDelegationExpenses(delegationId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{personName}'s charges on your card</h2>
        {repayments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#D97706', margin: 0 }}>Pending payment claims</p>
            {repayments.map((r) => (
              <div key={r.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: 0 }}>{fmt(r.amount)}</p>
                  <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>{fmtDate(r.createdAt)}</p>
                </div>
                <button onClick={() => onApprove({ delegationId, repaymentId: r.id })} disabled={approveIsPending} style={{ padding: '6px 12px', background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Approve</button>
                <button onClick={() => onReject({ delegationId, repaymentId: r.id })} disabled={rejectIsPending} style={{ padding: '6px 12px', background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Reject</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {isLoading && <p style={{ fontSize: 13, color: '#B0B8C4', textAlign: 'center', padding: '16px 0' }}>{t('common.loading')}</p>}
          {!isLoading && expenses.length === 0 && <p style={{ fontSize: 13, color: '#B0B8C4', textAlign: 'center', padding: '16px 0' }}>No expenses yet</p>}
          {expenses.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderBottom: '1px solid #F0F2F7' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || 'Expense'}</p>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{fmtDate(e.expenseDate)}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>{fmt(e.amount)}</p>
                {e.willRepay && (
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: e.isRepaid ? '#D1FAE5' : '#FEF3C7', color: e.isRepaid ? '#059669' : '#D97706' }}>
                    {e.isRepaid ? 'Repaid' : 'To repay'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Link owner's own card ─────────────────────────────────────────────────────
function LinkMyCardSheet({ delegation, onClose }) {
  const { data: myTypes = [] } = usePaymentTypes();
  const linkOwnerCard = useLinkOwnerCard();
  const creditCards = myTypes.filter((t) => t.cardType === 'CREDIT_CARD');
  const [verifyFor, setVerifyFor] = useState(null);

  const handleSelect = (ptId) => setVerifyFor(ptId);

  const doLink = async (ptId, actionToken) => {
    try {
      await linkOwnerCard.mutateAsync({ delegationId: delegation.id, ownerPaymentTypeId: ptId, _actionToken: actionToken });
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to link card');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto' }} />
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>Link your card</h2>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 0 }}>
            Select your credit card entry for this physical card so you can see a combined bill
          </p>
        </div>
        {creditCards.length === 0 ? (
          <p style={{ fontSize: 13, color: '#B0B8C4', textAlign: 'center', padding: '16px 0' }}>
            No credit cards in your Payment Types. Add one first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {creditCards.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                disabled={linkOwnerCard.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px', borderRadius: 12,
                  border: '1.5px solid #E5E7EB', background: '#fff',
                  textAlign: 'left', cursor: 'pointer',
                  opacity: linkOwnerCard.isPending ? 0.5 : 1,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {t.icon || '🏦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: 0 }}>{t.name}</p>
                  {(t.cardLastFour || t.cardHolderName) && (
                    <p style={{ fontSize: 11, color: '#B0B8C4', fontFamily: 'monospace', margin: 0 }}>
                      {t.cardLastFour ? `•••• ${t.cardLastFour}` : ''}
                      {t.cardHolderName ? `  ${t.cardHolderName}` : ''}
                    </p>
                  )}
                </div>
                <span style={{ color: '#00C2B2', fontSize: 13, fontWeight: 600 }}>Select →</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {verifyFor && (
        <VerifyIdentitySheet
          title="Verify to link card"
          description="Linking your card to a delegation requires identity verification"
          onVerified={(token) => { setVerifyFor(null); doLink(verifyFor, token); }}
          onClose={() => setVerifyFor(null)}
        />
      )}
    </div>
  );
}

// ─── Combined bill sheet ───────────────────────────────────────────────────────
function CombinedBillSheet({ delegationId, onClose }) {
  const { t } = useTranslation();
  const { data, isLoading } = useCombinedBill(delegationId);

  if (!data && !isLoading) return null;

  const cycleLabel = data
    ? `${fmtDate(data.cycleStart)} – ${fmtDate(data.cycleEnd)}`
    : '';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 99, margin: '0 auto' }} />
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>Combined Bill</h2>
          {data?.card && (
            <p style={{ fontSize: 11, color: '#B0B8C4', fontFamily: 'monospace', marginTop: 2, marginBottom: 0 }}>
              {data.card.cardLastFour ? `•••• ${data.card.cardLastFour}` : data.card.name}
              {data.card.cardHolderName ? `  ·  ${data.card.cardHolderName}` : ''}
            </p>
          )}
          {cycleLabel && <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 2, marginBottom: 0 }}>Cycle: {cycleLabel}</p>}
        </div>

        {isLoading && <p style={{ fontSize: 13, color: '#B0B8C4', textAlign: 'center', padding: '32px 0' }}>{t('common.loading')}</p>}

        {data && (
          <>
            {/* Summary */}
            <div style={{ background: '#E6FAF9', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#009E90' }}>{data.owner.name}'s charges</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#009E90' }}>{fmt(data.summary.ownerTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#009E90' }}>{data.requester.name}'s charges</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#009E90' }}>{fmt(data.summary.requesterTotal)}</span>
              </div>
              <div style={{ height: 1, background: '#B2EBE8' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>Combined total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14' }}>{fmt(data.summary.combinedTotal)}</span>
              </div>
              {data.summary.willRepayTotal > 0 && (
                <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>
                  {data.requester.name} will repay {fmt(data.summary.willRepayTotal)}
                </p>
              )}
            </div>

            {/* Owner's expenses */}
            {data.ownerExpenses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  {data.owner.name}'s expenses
                </p>
                {data.ownerExpenses.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #F0F2F7' }}>
                    <span style={{ fontSize: 18 }}>{e.category?.icon || '💳'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || 'Expense'}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{fmtDate(e.expenseDate)}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', flexShrink: 0 }}>{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Requester's expenses */}
            {data.requesterExpenses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  {data.requester.name}'s expenses
                </p>
                {data.requesterExpenses.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #F0F2F7' }}>
                    <span style={{ fontSize: 18 }}>{e.category?.icon || '💳'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || 'Expense'}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{fmtDate(e.expenseDate)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>{fmt(e.amount)}</p>
                      {e.willRepay && (
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, background: e.isRepaid ? '#D1FAE5' : '#FEF3C7', color: e.isRepaid ? '#059669' : '#D97706' }}>
                          {e.isRepaid ? 'Repaid' : 'To repay'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!data.hasOwnerCard && (
              <p style={{ fontSize: 11, color: '#D97706', textAlign: 'center' }}>
                Link your card entry to see your own expenses here
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Person avatar ─────────────────────────────────────────────────────────────
function PersonAvatar({ name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'linear-gradient(135deg,#00C2B2,#009E90)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: 15,
    }}>
      {initials}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function CardDelegationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCardDelegations();
  const { data: balance }   = useCardDelegationBalance();
  const approveDelegation   = useApproveDelegation();
  const rejectDelegation    = useRejectDelegation();
  const revokeDelegation    = useRevokeDelegation();
  const createRepayment     = useCreateRepayment();
  const approveRepayment    = useApproveRepayment();
  const rejectRepayment     = useRejectRepayment();

  const [repaySheet, setRepaySheet]       = useState(null);
  const [ownerSheet, setOwnerSheet]       = useState(null);
  const [linkCardSheet, setLinkCardSheet] = useState(null);
  const [billSheet, setBillSheet]         = useState(null);
  const [verifySheet, setVerifySheet]     = useState(null);

  const outgoing = data?.outgoing || [];
  const incoming = data?.incoming || [];

  const handleRepay = async (payload) => {
    await createRepayment.mutateAsync(payload);
    setRepaySheet(null);
  };

  const requireVerify = (actionFn) => setVerifySheet({ actionFn });

  const statusBadge = (status) => {
    if (status === 'PENDING') return <Badge variant="neutral">{t('balance.pending')}</Badge>;
    if (status === 'ACTIVE')  return <Badge variant="active">Active</Badge>;
    return <Badge variant="neutral">Revoked</Badge>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.shared_cards')} showBack />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* ── Cards I use (outgoing) ── */}
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 0 }}>
            Cards I use (Dad / others pay)
          </p>
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {isLoading && <p style={{ padding: '24px 16px', fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>{t('common.loading')}</p>}
            {!isLoading && outgoing.length === 0 && (
              <p style={{ padding: '24px 16px', fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>
                No delegations yet — go to Payment Types to link a credit card
              </p>
            )}
            {outgoing.map((d, idx) => {
              const balItem         = balance?.iOwe?.find((b) => b.delegationId === d.id);
              const outstanding     = balItem?.outstanding || 0;
              const pendingApproval = balItem?.pendingApproval || 0;
              const pendingExpenses = balItem?.expenses || [];

              return (
                <div
                  key={d.id}
                  style={{
                    padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    borderBottom: idx < outgoing.length - 1 ? '1px solid #F0F2F7' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <PersonAvatar name={d.owner.name || d.owner.email} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{d.paymentType.name}</p>
                        {statusBadge(d.status)}
                      </div>
                      {(d.paymentType.cardLastFour || d.paymentType.cardHolderName) && (
                        <p style={{ fontSize: 11, color: '#B0B8C4', fontFamily: 'monospace', margin: '2px 0 0' }}>
                          {d.paymentType.cardLastFour ? `•••• ${d.paymentType.cardLastFour}` : ''}
                          {d.paymentType.cardHolderName ? `  ${d.paymentType.cardHolderName}` : ''}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: '#374151', margin: '2px 0 0' }}>Owner: {d.owner.name || d.owner.email}</p>
                    </div>
                    {d.status !== 'REVOKED' && (
                      <button
                        onClick={() => revokeDelegation.mutate(d.id)}
                        style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>

                  {d.status === 'ACTIVE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FFFE', borderRadius: 12, padding: '10px 12px', border: '1px solid #E6FAF9' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('balance.you_owe')}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{fmt(outstanding)}</p>
                        {pendingApproval > 0 && (
                          <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>{fmt(pendingApproval)} pending owner confirmation</p>
                        )}
                      </div>
                      <button
                        onClick={() => setBillSheet(d.id)}
                        style={{ padding: '6px 12px', border: '1.5px solid #00C2B2', fontSize: 11, fontWeight: 600, borderRadius: 8, color: '#009E90', background: '#E6FAF9', cursor: 'pointer' }}
                      >
                        Combined bill
                      </button>
                      {outstanding > 0 && pendingExpenses.length > 0 && (
                        <button
                          onClick={() => setRepaySheet({ delegationId: d.id, expenses: pendingExpenses })}
                          style={{ padding: '6px 12px', background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </SurfaceCard>
        </div>

        {/* ── Cards I own (incoming) ── */}
        <div style={{ padding: '24px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 0 }}>
            My cards others use
          </p>
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {!isLoading && incoming.length === 0 && (
              <p style={{ padding: '24px 16px', fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>No one is using your cards</p>
            )}
            {incoming.map((d, idx) => {
              const balItem           = balance?.owedToMe?.find((b) => b.delegationId === d.id);
              const outstanding       = balItem?.outstanding || 0;
              const pendingRepayments = balItem?.repayments || [];

              return (
                <div
                  key={d.id}
                  style={{
                    padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    borderBottom: idx < incoming.length - 1 ? '1px solid #F0F2F7' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <PersonAvatar name={d.requestedBy.name || d.requestedBy.email} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{d.paymentType.name}</p>
                        {statusBadge(d.status)}
                      </div>
                      {(d.paymentType.cardLastFour || d.paymentType.cardHolderName) && (
                        <p style={{ fontSize: 11, color: '#B0B8C4', fontFamily: 'monospace', margin: '2px 0 0' }}>
                          {d.paymentType.cardLastFour ? `•••• ${d.paymentType.cardLastFour}` : ''}
                          {d.paymentType.cardHolderName ? `  ${d.paymentType.cardHolderName}` : ''}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: '#374151', margin: '2px 0 0' }}>Used by: {d.requestedBy.name || d.requestedBy.email}</p>
                    </div>
                  </div>

                  {d.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => requireVerify((token) => approveDelegation.mutateAsync({ id: d.id, _actionToken: token }))}
                        disabled={approveDelegation.isPending}
                        style={{ flex: 1, padding: '10px 0', background: '#22C55E', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', opacity: approveDelegation.isPending ? 0.5 : 1 }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectDelegation.mutate(d.id)}
                        disabled={rejectDelegation.isPending}
                        style={{ flex: 1, padding: '10px 0', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', opacity: rejectDelegation.isPending ? 0.5 : 1 }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {d.status === 'ACTIVE' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FFFE', borderRadius: 12, padding: '10px 12px', border: '1px solid #E6FAF9' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('balance.owes_you')}</p>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{fmt(outstanding)}</p>
                          {pendingRepayments.length > 0 && (
                            <p style={{ fontSize: 11, color: '#D97706', margin: 0 }}>{pendingRepayments.length} payment claim(s) to review</p>
                          )}
                        </div>
                        <button
                          onClick={() => setBillSheet(d.id)}
                          style={{ padding: '6px 12px', border: '1.5px solid #00C2B2', fontSize: 11, fontWeight: 600, borderRadius: 8, color: '#009E90', background: '#E6FAF9', cursor: 'pointer' }}
                        >
                          Combined bill
                        </button>
                        <button
                          onClick={() => setOwnerSheet({ delegationId: d.id, personName: d.requestedBy.name || 'Card user', repayments: pendingRepayments })}
                          style={{ padding: '6px 12px', border: '1.5px solid #E5E7EB', fontSize: 11, fontWeight: 600, borderRadius: 8, color: '#374151', background: '#fff', cursor: 'pointer' }}
                        >
                          View charges
                        </button>
                      </div>

                      {/* Link my card / show linked */}
                      {d.ownerPaymentType ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
                          <span style={{ fontSize: 12, color: '#059669' }}>
                            🔗 Your card linked: {d.ownerPaymentType.name}
                            {d.ownerPaymentType.cardLastFour ? ` (•••• ${d.ownerPaymentType.cardLastFour})` : ''}
                          </span>
                          <button onClick={() => setLinkCardSheet(d)} style={{ fontSize: 12, color: '#B0B8C4', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Change</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLinkCardSheet(d)}
                          style={{ fontSize: 12, color: '#009E90', fontWeight: 600, background: 'none', border: 'none', textAlign: 'left', padding: '0 4px', cursor: 'pointer' }}
                        >
                          + Link your card to this delegation (for combined bill)
                        </button>
                      )}

                      <button
                        onClick={() => revokeDelegation.mutate(d.id)}
                        style={{ fontSize: 12, color: '#EF4444', background: 'none', border: 'none', textAlign: 'left', padding: '0 4px', cursor: 'pointer' }}
                      >
                        Revoke access
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </SurfaceCard>
        </div>
      </div>

      {repaySheet && (
        <RepaySheet
          delegationId={repaySheet.delegationId}
          expenses={repaySheet.expenses}
          onClose={() => setRepaySheet(null)}
          onSubmit={handleRepay}
          isPending={createRepayment.isPending}
        />
      )}

      {ownerSheet && (
        <OwnerExpensesSheet
          delegationId={ownerSheet.delegationId}
          personName={ownerSheet.personName}
          repayments={ownerSheet.repayments}
          onClose={() => setOwnerSheet(null)}
          onApprove={(p) => approveRepayment.mutate(p)}
          onReject={(p) => rejectRepayment.mutate(p)}
          approveIsPending={approveRepayment.isPending}
          rejectIsPending={rejectRepayment.isPending}
        />
      )}

      {linkCardSheet && (
        <LinkMyCardSheet
          delegation={linkCardSheet}
          onClose={() => setLinkCardSheet(null)}
        />
      )}

      {billSheet && (
        <CombinedBillSheet
          delegationId={billSheet}
          onClose={() => setBillSheet(null)}
        />
      )}

      {verifySheet && (
        <VerifyIdentitySheet
          title="Verify to approve"
          description="Granting card access requires identity verification for your security"
          onVerified={async (actionToken) => {
            setVerifySheet(null);
            try {
              await verifySheet.actionFn(actionToken);
            } catch (err) {
              alert(err?.response?.data?.error || 'Action failed');
            }
          }}
          onClose={() => setVerifySheet(null)}
        />
      )}
    </div>
  );
}
