import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import HeroCard from '../../components/ui/HeroCard';
import { useBalances, usePaidForSummary, useRequestPayment, useAcceptPayment, useRejectPayment, useWaiveSplit, useMarkReceived, useMarkAllReceived } from '../../hooks/useSplits';
import { useBulkPayments, useCreateBulkPayment, useRespondBulkPayment, useCancelBulkPayment } from '../../hooks/useBulkPayments';
import { useGroups } from '../../hooks/useGroups';
import { useCardDelegationBalance } from '../../hooks/useCardDelegation';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? format(new Date(d), 'd MMM') : '');

/* --- Status badge --- */
function StatusBadge({ status }) {
  const { t } = useTranslation();
  if (status === 'PENDING')
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#E9ECF0', color: '#B0B8C4', fontWeight: 600 }}>
        {t('balance.pending')}
      </span>
    );
  if (status === 'PAYMENT_REQUESTED')
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontWeight: 600 }}>
        {t('balance.claimed_paid')}
      </span>
    );
  return null;
}

/* --- Single split row --- */
function SplitRow({ split, mode, onAccept, onReject, onPay, onWaive, onMarkReceived, isBusy, isInBulk }) {
  const { t } = useTranslation();
  const [confirmWaive, setConfirmWaive] = useState(false);
  const title = split.expense?.title || 'Expense';
  const amount = Number(split.amount);

  return (
    <div style={{
      padding: '10px 14px',
      borderTop: '1px solid #F0F2F7',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      opacity: isInBulk ? 0.6 : 1,
      background: '#F8F9FB',
      borderRadius: 10,
      borderLeft: `3px solid ${mode === 'owed' ? '#00C2B2' : '#E11D48'}`,
      margin: '0 14px 6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
          <p style={{ fontSize: 11, color: '#B0B8C4' }}>{fmtDate(split.expense?.expenseDate)}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>{fmt(amount)}</span>
          <StatusBadge status={split.status} />
        </div>
      </div>

      {mode === 'owed' && split.status === 'PAYMENT_REQUESTED' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" className="flex-1 !min-h-[36px] text-xs" onClick={() => onAccept(split.id)} disabled={isBusy}>
            {t('balance.accept')}
          </Button>
          <Button variant="danger" className="flex-1 !min-h-[36px] text-xs" onClick={() => onReject(split.id)} disabled={isBusy}>
            {t('balance.reject')}
          </Button>
        </div>
      )}

      {mode === 'owed' && split.status === 'PENDING' && (
        <Button variant="outline" className="w-full !min-h-[36px] text-xs !border-green-400 !text-green-600" onClick={() => onMarkReceived(split.id)} disabled={isBusy}>
          {t('balance.mark_received')}
        </Button>
      )}

      {mode === 'owed' && !confirmWaive && (
        <button
          style={{ fontSize: 11, color: '#B0B8C4', textAlign: 'right', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setConfirmWaive(true)}
        >
          {t('balance.wave_off')}
        </button>
      )}

      {mode === 'owed' && confirmWaive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF7ED', borderRadius: 10, padding: '8px 12px' }}>
          <p style={{ fontSize: 11, color: '#C2410C', flex: 1 }}>{t('balance.forgive_confirm', { amount: fmt(amount) })}</p>
          <button
            style={{ fontSize: 11, fontWeight: 700, color: '#EA580C', padding: '4px 8px', borderRadius: 8, border: '1px solid #FED7AA', background: 'none', cursor: 'pointer' }}
            onClick={() => { onWaive(split.id); setConfirmWaive(false); }}
            disabled={isBusy}
          >
            {t('balance.yes_forgive')}
          </button>
          <button
            style={{ fontSize: 11, color: '#B0B8C4', padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setConfirmWaive(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {mode === 'iowe' && split.status === 'PENDING' && !isInBulk && (
        <Button variant="outline" className="w-full !min-h-[36px] text-xs" onClick={() => onPay(split.id)} disabled={isBusy}>
          {t('balance.mark_paid')}
        </Button>
      )}

      {mode === 'iowe' && split.status === 'PAYMENT_REQUESTED' && (
        <p style={{ fontSize: 11, color: '#D97706', textAlign: 'center', padding: '4px 0' }}>⏳ {t('balance.waiting')}</p>
      )}
    </div>
  );
}

/* --- Bulk payment sheet (select splits + note + send) --- */
function BulkPaySheet({ group, onClose }) {
  const { t } = useTranslation();
  const pendingSplits = group.splits.filter((s) => s.status === 'PENDING');
  const [selected, setSelected] = useState(new Set(pendingSplits.map((s) => s.id)));
  const [note, setNote] = useState('');
  const create = useCreateBulkPayment();

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedSplits = pendingSplits.filter((s) => selected.has(s.id));
  const total = selectedSplits.reduce((sum, s) => sum + Number(s.amount), 0);

  const submit = () => {
    if (selectedSplits.length === 0) return;
    create.mutate(
      { toUserId: group.payerUserId, splitIds: [...selected], note: note || undefined },
      { onSuccess: onClose }
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,13,20,0.55)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%', background: '#fff',
        borderRadius: '24px 24px 0 0', padding: '0 20px 40px',
        display: 'flex', flexDirection: 'column', gap: 16,
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ background: '#E9ECF0', width: 40, height: 4, borderRadius: 2, margin: '12px auto 4px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg,#E11D48,#F43F5E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {group.payerName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>{t('balance.pay_together', { name: group.payerName })}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.select_bundle')}</p>
          </div>
        </div>

        {/* Split checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E9ECF0', borderRadius: 14, overflow: 'hidden' }}>
          {pendingSplits.map((split) => {
            const checked = selected.has(split.id);
            return (
              <button
                key={split.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', textAlign: 'left',
                  background: checked ? '#E6FAF9' : '#fff',
                  border: 'none', cursor: 'pointer',
                  borderTop: '1px solid #F0F2F7',
                  transition: 'background 0.15s',
                }}
                onClick={() => toggle(split.id)}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: checked ? '2px solid #00C2B2' : '2px solid #E9ECF0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, background: checked ? '#00C2B2' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  {checked && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{split.expense?.title || 'Expense'}</p>
                  <p style={{ fontSize: 11, color: '#B0B8C4' }}>{fmtDate(split.expense?.expenseDate)}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{fmt(split.amount)}</span>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('balance.add_note')}
          style={{
            width: '100%', padding: '12px 16px', border: '1px solid #E9ECF0',
            background: '#fff', borderRadius: 12, fontSize: 13, color: '#374151',
            outline: 'none', boxSizing: 'border-box',
          }}
        />

        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <p style={{ fontSize: 13, color: '#B0B8C4' }}>
            {selectedSplits.length === 1
              ? t('balance.selected_one', { n: selectedSplits.length })
              : t('balance.selected_other', { n: selectedSplits.length })}
          </p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#0A0D14' }}>{fmt(total)}</p>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={create.isPending || selectedSplits.length === 0}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: '#E11D48', color: '#fff', fontWeight: 700,
            fontSize: 14, border: 'none', cursor: 'pointer',
            opacity: (create.isPending || selectedSplits.length === 0) ? 0.5 : 1,
            transition: 'transform 0.15s',
          }}
        >
          {create.isPending ? t('balance.sending') : t('balance.send_payment', { amount: fmt(total) })}
        </button>
      </div>
    </div>
  );
}

/* --- Incoming bulk payment card (for Owed to me tab) --- */
function IncomingBulkCard({ bp, onAccept, onReject, isBusy }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const total = Number(bp.totalAmount);
  const count = bp.splits.length;

  return (
    <div style={{
      background: '#fff', borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
      border: '1px solid #E6FAF9',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 8px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg,#00C2B2,#009E90)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {bp.fromUser.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>{t('balance.wants_to_pay', { name: bp.fromUser.name })}</p>
          <p style={{ fontSize: 11, color: '#B0B8C4' }}>
            {count === 1
              ? t('balance.exp_one', { n: count, amount: fmt(total) })
              : t('balance.exp_other', { n: count, amount: fmt(total) })}
          </p>
        </div>
        <span style={{ fontSize: 11, background: '#E6FAF9', color: '#009E90', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
          💸 {t('balance.bulk')}
        </span>
      </div>

      {/* Note */}
      {bp.note && (
        <p style={{ fontSize: 11, color: '#B0B8C4', fontStyle: 'italic', padding: '0 16px 8px' }}>"{bp.note}"</p>
      )}

      {/* Expand toggle */}
      <button
        style={{ width: '100%', fontSize: 11, color: '#B0B8C4', padding: '0 16px 8px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? t('balance.hide_expenses') : t('balance.show_expenses')}
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #F0F2F7' }}>
          {bp.splits.map((s) => (
            <div key={s.splitId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #F0F2F7' }}>
              <div>
                <p style={{ fontSize: 12, color: '#374151' }}>{s.split.expense?.title || 'Expense'}</p>
                <p style={{ fontSize: 11, color: '#B0B8C4' }}>{fmtDate(s.split.expense?.expenseDate)}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{fmt(s.split.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px 16px' }}>
        <Button variant="primary" className="flex-1 !min-h-[40px] text-sm" onClick={() => onAccept(bp.id)} disabled={isBusy}>
          {t('balance.accept')}
        </Button>
        <Button variant="danger" className="flex-1 !min-h-[40px] text-sm" onClick={() => onReject(bp.id)} disabled={isBusy}>
          {t('balance.reject')}
        </Button>
      </div>
    </div>
  );
}

/* --- Sent bulk payment (shown inside iOwe group) --- */
function SentBulkBanner({ bp, onCancel, isBusy }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const total = Number(bp.totalAmount);
  const count = bp.splits.length;

  return (
    <div style={{ margin: '0 14px 12px', background: '#E6FAF9', border: '1px solid #00C2B2', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#009E90' }}>⏳ {t('balance.bulk_pending')}</p>
          <p style={{ fontSize: 11, color: '#00C2B2' }}>
            {count === 1
              ? t('balance.exp_one', { n: count, amount: fmt(total) })
              : t('balance.exp_other', { n: count, amount: fmt(total) })}
          </p>
        </div>
        <button
          onClick={() => onCancel(bp.id)}
          disabled={isBusy}
          style={{ fontSize: 11, color: '#E11D48', fontWeight: 600, padding: '6px 10px', borderRadius: 8, border: '1px solid #FEE2E2', background: '#fff', cursor: 'pointer', opacity: isBusy ? 0.5 : 1 }}
        >
          {t('common.cancel')}
        </button>
      </div>
      <button
        style={{ fontSize: 11, color: '#009E90', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? '▲ hide' : '▼ view expenses'}
      </button>
      {expanded && bp.splits.map((s) => (
        <p key={s.splitId} style={{ fontSize: 11, color: '#009E90', marginTop: 4 }}>
          {s.split.expense?.title || 'Expense'} · {fmt(s.split.amount)}
        </p>
      ))}
    </div>
  );
}

/* --- PersonCard for "Owed to me" --- */
function OwedPersonCard({ group, onAccept, onReject, onWaive, onMarkReceived, onMarkAllReceived, isBusy }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  const pendingSplits = group.splits.filter((s) => ['PENDING', 'PAYMENT_REQUESTED'].includes(s.status));

  return (
    <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 14px', gap: 12 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {group.personName?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.personName}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>
              {group.splits.length} {group.splits.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{fmt(group.total)}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.owes_you')}</p>
          </div>
          <span style={{ color: '#B0B8C4', fontSize: 11, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={() => navigate(`/balances/history/${group.personId}`)}
          style={{
            flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: '50%', background: '#F0F2F7',
            color: '#B0B8C4', border: 'none', cursor: 'pointer',
          }}
          title={t('balance.history')}
        >
          📈
        </button>
      </div>

      {pendingSplits.length > 1 && (
        <div style={{ padding: '0 14px 10px' }}>
          <button
            onClick={() => onMarkAllReceived(group.personId)}
            disabled={isBusy}
            style={{
              width: '100%', padding: '8px', borderRadius: 12,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              color: '#059669', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', opacity: isBusy ? 0.5 : 1,
            }}
          >
            ✓ Mark all received · {fmt(group.total)}
          </button>
        </div>
      )}

      {expanded &&
        group.splits.map((split) => (
          <SplitRow key={split.id} split={split} mode="owed" onAccept={onAccept} onReject={onReject} onWaive={onWaive} onMarkReceived={onMarkReceived} isBusy={isBusy} />
        ))}
      {expanded && <div style={{ height: 8 }} />}
    </div>
  );
}

/* --- PersonCard for "I owe" --- */
function IOwePersonCard({ group, sentBulkPayments, onPay, onBulkPay, onCancelBulk, isBusy }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);

  const pendingBulk = sentBulkPayments.filter(
    (bp) => bp.toUserId === group.payerUserId && bp.status === 'PENDING'
  );
  const bulkSplitIds = new Set(pendingBulk.flatMap((bp) => bp.splits.map((s) => s.splitId)));

  const pendingSplitsCount = group.splits.filter((s) => s.status === 'PENDING' && !bulkSplitIds.has(s.id)).length;
  const hasPendingBulk = pendingBulk.length > 0;

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 14px', gap: 12, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg,#E11D48,#F43F5E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {group.payerName?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.payerName}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>
              {group.splits.length} {group.splits.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#E11D48' }}>{fmt(group.total)}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.you_owe')}</p>
          </div>
          <span style={{ color: '#B0B8C4', fontSize: 11, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
        </button>

        {/* Pending bulk banners */}
        {expanded && pendingBulk.map((bp) => (
          <SentBulkBanner key={bp.id} bp={bp} onCancel={onCancelBulk} isBusy={isBusy} />
        ))}

        {/* Individual splits */}
        {expanded &&
          group.splits.map((split) => (
            <SplitRow
              key={split.id}
              split={split}
              mode="iowe"
              onPay={onPay}
              isBusy={isBusy}
              isInBulk={bulkSplitIds.has(split.id)}
            />
          ))}

        {/* Pay together + UPI buttons */}
        {expanded && pendingSplitsCount >= 1 && !hasPendingBulk && (
          <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #F0F2F7', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setBulkOpen(true)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12,
                border: '2px solid #00C2B2', color: '#009E90',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(0,194,178,0.1)', cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
            >
              💸 {t('balance.pay_together_btn')}
            </button>
            {group.payerEmail && (
              <a
                href={`upi://pay?pa=${encodeURIComponent(group.payerEmail)}&pn=${encodeURIComponent(group.payerName || '')}&am=${group.total}&cu=INR`}
                style={{
                  padding: '10px 16px', borderRadius: 12,
                  border: '2px solid #059669', color: '#059669',
                  fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  textDecoration: 'none', transition: 'transform 0.15s',
                }}
              >
                {t('balance.pay_upi')}
              </a>
            )}
          </div>
        )}
        {expanded && <div style={{ height: 4 }} />}
      </div>

      {bulkOpen && <BulkPaySheet group={group} onClose={() => setBulkOpen(false)} />}
    </>
  );
}

/* --- Paid for others card --- */
function PaidForPersonCard({ person }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasOutstanding = person.totalOutstanding > 0;

  return (
    <button
      style={{
        width: '100%', background: '#fff', borderRadius: 18,
        boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', border: 'none', cursor: 'pointer',
      }}
      onClick={() => navigate(`/balances/person/${person.personId}`)}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'linear-gradient(135deg,#F59E0B,#FBBF24)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {person.personName?.[0]?.toUpperCase() || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.personName}</p>
        <p style={{ fontSize: 11, color: '#B0B8C4' }}>{person.expenseCount} {person.expenseCount === 1 ? 'expense' : 'expenses'}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {hasOutstanding ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>{fmt(person.totalOutstanding)}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.outstanding')}</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{t('balance.settled')}</p>
            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{fmt(person.totalSettled)}</p>
          </>
        )}
      </div>
      <span style={{ color: '#B0B8C4', fontSize: 14, marginLeft: 4 }}>›</span>
    </button>
  );
}

/* --- Group balance card --- */
function GroupBalanceCard({ group, mode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const amount = Math.abs(group.myNet);

  return (
    <button
      style={{
        width: '100%', background: '#fff', borderRadius: 18,
        boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', border: '1px solid #E6FAF9', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#E6FAF9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {group.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: '#E6FAF9', color: '#009E90', flexShrink: 0 }}>
            👥 {t('balance.group_badge')}
          </span>
        </div>
        <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.members_tap', { n: group.memberCount })}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: mode === 'owed' ? '#059669' : '#E11D48' }}>
          {fmt(amount)}
        </p>
        <p style={{ fontSize: 11, color: '#B0B8C4' }}>{mode === 'owed' ? t('balance.owes_you') : t('balance.you_owe')}</p>
      </div>
      <span style={{ color: '#B0B8C4', fontSize: 14, marginLeft: 4 }}>›</span>
    </button>
  );
}

/* --- Main page --- */
export default function BalancesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('owed');
  const { data, isLoading } = useBalances();
  const { data: paidFor = [], isLoading: paidForLoading } = usePaidForSummary();
  const { data: bulkData } = useBulkPayments();
  const { data: groups = [] } = useGroups();
  const { data: cardBalance } = useCardDelegationBalance();
  const cardIOwe    = cardBalance?.iOwe    || [];
  const cardOwedMe  = cardBalance?.owedToMe || [];

  const groupsOwedToMe = groups.filter((g) => g.myNet > 0.01);
  const groupsIOwe = groups.filter((g) => g.myNet < -0.01);

  const pay = useRequestPayment();
  const accept = useAcceptPayment();
  const reject = useRejectPayment();
  const waive = useWaiveSplit();
  const markReceived = useMarkReceived();
  const markAllReceived = useMarkAllReceived();
  const respondBulk = useRespondBulkPayment();
  const cancelBulk = useCancelBulkPayment();

  const isBusy = pay.isPending || accept.isPending || reject.isPending || waive.isPending || markReceived.isPending || markAllReceived.isPending || respondBulk.isPending || cancelBulk.isPending;

  const sentBulkPayments = bulkData?.sent || [];
  const receivedBulkPayments = (bulkData?.received || []).filter((bp) => bp.status === 'PENDING');

  const owedCount = (data?.owedToMe?.reduce((s, g) => s + g.splits.length, 0) || 0) + groupsOwedToMe.length;
  const iOweCount = (data?.iOwe?.reduce((s, g) => s + g.splits.length, 0) || 0) + groupsIOwe.length;
  const paidForCount = paidFor.filter((p) => p.totalOutstanding > 0).length;
  const incomingBulkCount = receivedBulkPayments.length;

  const [shareToast, setShareToast] = useState('');

  // Compute hero card totals
  const totalOwedToMe =
    (data?.owedToMe?.reduce((s, g) => s + g.total, 0) || 0) +
    groupsOwedToMe.reduce((s, g) => s + Math.abs(g.myNet), 0) +
    cardOwedMe.reduce((s, c) => s + Number(c.outstanding || 0), 0);

  const totalIOwe =
    (data?.iOwe?.reduce((s, g) => s + g.total, 0) || 0) +
    groupsIOwe.reduce((s, g) => s + Math.abs(g.myNet), 0) +
    cardIOwe.reduce((s, c) => s + Number(c.outstanding || 0), 0);

  // Tab index mapping
  const tabKeys = ['owed', 'iowe', 'paidfor'];
  const activeTab = tabKeys.indexOf(tab);
  const setActiveTab = (i) => setTab(tabKeys[i]);

  async function handleShare() {
    const lines = ['💰 HisabKitab — Balances', '────────────────────'];
    const owedGroups = data?.owedToMe || [];
    const iOweGroups = data?.iOwe || [];
    const totalOwed = owedGroups.reduce((s, g) => s + g.total, 0);
    const totalIOweFmt = iOweGroups.reduce((s, g) => s + g.total, 0);

    if (owedGroups.length > 0) {
      lines.push('Owed to me:');
      owedGroups.forEach((g) => lines.push(`  • ${g.personName}: ${fmt(g.total)}`));
      lines.push(`Total: ${fmt(totalOwed)}`);
    }
    if (iOweGroups.length > 0) {
      lines.push('');
      lines.push('I owe:');
      iOweGroups.forEach((g) => lines.push(`  • ${g.payerName}: ${fmt(g.total)}`));
      lines.push(`Total: ${fmt(totalIOweFmt)}`);
    }
    const net = totalOwed - totalIOweFmt;
    if (totalOwed > 0 || totalIOweFmt > 0) {
      lines.push('');
      lines.push(`Net: ${net >= 0 ? '+' : ''}${fmt(net)}`);
    }
    lines.push('');
    lines.push('Tracked with HisabKitab 📊');
    const text = lines.join('\n');

    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareToast('Copied to clipboard!');
        setTimeout(() => setShareToast(''), 2500);
      } catch (_) {}
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('balance.title')}
        showBell
        action={
          <button onClick={handleShare} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#B0B8C4', background: 'none', border: 'none', cursor: 'pointer' }}>
            📤
          </button>
        }
      />

      {/* Hero summary cards */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#10B981)', borderRadius: 16, padding: '14px 16px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>Owed to You</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>₹{totalOwedToMe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(135deg,#E11D48,#F43F5E)', borderRadius: 16, padding: '14px 16px', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>You Owe</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>₹{totalIOwe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#E9ECF0', borderRadius: 12, padding: 4, margin: '16px 16px 0', gap: 4 }}>
        {['Owed to Me', 'I Owe', 'Paid For'].map((label, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 12, fontWeight: 700,
              background: activeTab === i ? '#fff' : 'transparent',
              color: activeTab === i ? '#0A0D14' : '#B0B8C4',
              boxShadow: activeTab === i ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {(isLoading || paidForLoading) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: '#E9ECF0', borderRadius: 18, height: 80, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* -- Owed to me -- */}
        {!isLoading && tab === 'owed' && (
          <>
            {/* Incoming bulk payment requests at the top */}
            {receivedBulkPayments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
                  {t('balance.bulk_requests', { n: receivedBulkPayments.length })}
                </p>
                {receivedBulkPayments.map((bp) => (
                  <IncomingBulkCard
                    key={bp.id}
                    bp={bp}
                    onAccept={(id) => respondBulk.mutate({ id, action: 'ACCEPTED' })}
                    onReject={(id) => respondBulk.mutate({ id, action: 'REJECTED' })}
                    isBusy={isBusy}
                  />
                ))}
              </div>
            )}

            {/* Regular splits */}
            {data?.owedToMe?.length === 0 && receivedBulkPayments.length === 0 && groupsOwedToMe.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 64, gap: 12 }}>
                <span style={{ fontSize: 48 }}>🎉</span>
                <p style={{ fontSize: 14, color: '#B0B8C4' }}>{t('balance.no_owed')}</p>
              </div>
            ) : (
              <>
                {data?.owedToMe?.map((group) => (
                  <OwedPersonCard
                    key={group.personId}
                    group={group}
                    onAccept={(id) => accept.mutate(id)}
                    onReject={(id) => reject.mutate(id)}
                    onWaive={(id) => waive.mutate(id)}
                    onMarkReceived={(id) => markReceived.mutate(id)}
                    onMarkAllReceived={(pid) => markAllReceived.mutate(pid)}
                    isBusy={isBusy}
                  />
                ))}
                {groupsOwedToMe.length > 0 && (
                  <>
                    {data?.owedToMe?.length > 0 && (
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 0' }}>
                        {t('balance.from_groups')}
                      </p>
                    )}
                    {groupsOwedToMe.map((g) => (
                      <GroupBalanceCard key={g.id} group={g} mode="owed" />
                    ))}
                  </>
                )}
                {cardOwedMe.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 0' }}>
                      {t('balance.card_debts_from')}
                    </p>
                    {cardOwedMe.map((c) => (
                      <button
                        key={c.delegationId}
                        onClick={() => navigate('/settings/card-delegations')}
                        style={{
                          width: '100%', background: '#fff', borderRadius: 18,
                          boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                          textAlign: 'left', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: '#E6FAF9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>
                          {c.card.icon || '💳'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>{c.person.name || c.person.email}</p>
                          <p style={{ fontSize: 11, color: '#B0B8C4' }}>{c.card.name}</p>
                          {c.pendingApproval > 0 && (
                            <p style={{ fontSize: 11, color: '#D97706' }}>{t('balance.approval_needed', { amount: fmt(c.pendingApproval) })}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{fmt(c.outstanding)}</p>
                          <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.owes_you')}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* -- I owe -- */}
        {!isLoading && tab === 'iowe' && (
          data?.iOwe?.length === 0 && groupsIOwe.length === 0 && cardIOwe.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 64, gap: 12 }}>
              <span style={{ fontSize: 48 }}>✅</span>
              <p style={{ fontSize: 14, color: '#B0B8C4' }}>{t('balance.no_owe')}</p>
            </div>
          ) : (
            <>
              {data?.iOwe?.map((group) => (
                <IOwePersonCard
                  key={group.payerUserId}
                  group={group}
                  sentBulkPayments={sentBulkPayments}
                  onPay={(id) => pay.mutate({ splitId: id })}
                  onBulkPay={() => {}}
                  onCancelBulk={(id) => cancelBulk.mutate(id)}
                  isBusy={isBusy}
                />
              ))}
              {groupsIOwe.length > 0 && (
                <>
                  {data?.iOwe?.length > 0 && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 0' }}>
                      {t('balance.from_groups')}
                    </p>
                  )}
                  {groupsIOwe.map((g) => (
                    <GroupBalanceCard key={g.id} group={g} mode="iowe" />
                  ))}
                </>
              )}
              {cardIOwe.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 0' }}>
                    {t('balance.card_debts_to')}
                  </p>
                  {cardIOwe.map((c) => (
                    <button
                      key={c.delegationId}
                      onClick={() => navigate('/settings/card-delegations')}
                      style={{
                        width: '100%', background: '#fff', borderRadius: 18,
                        boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        textAlign: 'left', border: 'none', cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#FFF1F3',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {c.card.icon || '🏦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>{c.person.name || c.person.email}</p>
                        <p style={{ fontSize: 11, color: '#B0B8C4' }}>{c.card.name}</p>
                        {c.pendingApproval > 0 && (
                          <p style={{ fontSize: 11, color: '#D97706' }}>{t('balance.pending_confirmation', { amount: fmt(c.pendingApproval) })}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#E11D48' }}>{fmt(c.outstanding)}</p>
                        <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('balance.to_repay')}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )
        )}

        {/* -- Paid for -- */}
        {!paidForLoading && tab === 'paidfor' && (
          paidFor.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 64, gap: 12 }}>
              <span style={{ fontSize: 48 }}>🧾</span>
              <p style={{ fontSize: 14, color: '#B0B8C4' }}>{t('balance.no_paid')}</p>
              <p style={{ fontSize: 12, color: '#B0B8C4' }}>{t('balance.paid_hint')}</p>
            </div>
          ) : (
            paidFor.map((person) => (
              <PaidForPersonCard key={person.personId} person={person} />
            ))
          )
        )}
      </div>

      {shareToast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: '#0A0D14', color: '#fff',
          fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }}>
          {shareToast}
        </div>
      )}
    </div>
  );
}
