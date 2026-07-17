import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import TransactionRow from '../../components/ui/TransactionRow';
import {
  useGroup,
  useAddGroupExpense,
  useDeleteGroupExpense,
  useRecordSettlement,
} from '../../hooks/useGroups';
import { useRateMap } from '../../hooks/useExchangeRates';

const fmt = (n, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n || 0));

const currencySymbol = (currency = 'INR') => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(0).find(p => p.type === 'currency')?.value || currency; }
  catch { return currency; }
};
const fmtDate = (d) => format(new Date(d), 'd MMM');

const TYPE_ICON = { TRIP: '✈️', HOME: '🏠', WORK: '💼', COUPLE: '💑', OTHER: '👥' };

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Member Avatars ───────────────────────────────────────────────────────────

function MemberAvatarsRow({ members, max = 5 }) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <div
          key={m.id || i}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            marginLeft: i === 0 ? 0 : -8,
            zIndex: visible.length - i,
            position: 'relative',
          }}
        >
          {initials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#0A1628',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            marginLeft: -8,
            position: 'relative',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ group, currentUser }) {
  const [search, setSearch] = useState('');
  const deleteExpense = useDeleteGroupExpense(group.id);
  const rateMap = useRateMap();
  const allExpenses = group.groupExpenses || [];
  const expenses = search.trim()
    ? allExpenses.filter((e) => e.title?.toLowerCase().includes(search.toLowerCase()))
    : allExpenses;

  const myMember = group.members?.find((m) => m.userId === currentUser?.uid);

  if (allExpenses.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 16px', gap: 12 }}>
        <span style={{ fontSize: 48 }}>💸</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>No expenses yet</p>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Add the first one!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expenses…"
          style={{
            width: '100%',
            background: '#F0F2F7',
            borderRadius: 14,
            paddingLeft: 32,
            paddingRight: 16,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 14,
            color: '#374151',
            border: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {expenses.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 14, color: '#9CA3AF', padding: '32px 0' }}>No results for "{search}"</p>
      )}

      <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
        {[...expenses]
          .sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt))
          .map((exp, idx, arr) => {
            const myShare = myMember
              ? exp.shares?.find((s) => s.memberId === myMember.id)
              : null;
            const isAddedByMe = exp.addedBy?.userId === currentUser?.uid;
            const isPaidByMe = exp.paidBy?.userId === currentUser?.uid;
            const subtitle = [
              `Paid by ${exp.paidBy?.name || 'Someone'} · ${fmtDate(exp.expenseDate || exp.createdAt)}`,
              myShare && !isPaidByMe ? `Your share: ${fmt(myShare.amount, exp.currency)}` : null,
              exp.note || null,
            ].filter(Boolean).join(' · ');

            return (
              <TransactionRow
                key={exp.id}
                icon={exp.title?.[0]?.toUpperCase() || '💸'}
                iconBg="linear-gradient(135deg, #E6FAF9 0%, #B2F0EB 100%)"
                title={exp.title}
                subtitle={subtitle}
                amount={fmt(exp.amount, exp.currency)}
                isIncome={isPaidByMe}
                isLast={idx === arr.length - 1}
                rightSlot={
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', letterSpacing: '-0.3px' }}>
                      {fmt(exp.amount, exp.currency)}
                    </span>
                    {exp.currency && exp.currency !== 'INR' && (exp.rateAtTime != null || rateMap[exp.currency]) && (
                      <span style={{ fontSize: 10, color: '#B0B8C4' }}>
                        ≈ {fmt(Number(exp.amount) * (exp.rateAtTime != null ? Number(exp.rateAtTime) : rateMap[exp.currency]), 'INR')}
                      </span>
                    )}
                    {isPaidByMe && <Badge variant="active" label="You paid" />}
                    {isAddedByMe && !isPaidByMe && <Badge variant="neutral" label="Added by you" />}
                    <button
                      onClick={() => deleteExpense.mutate(exp.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, color: '#D1D5DB' }}
                    >
                      🗑
                    </button>
                  </div>
                }
              />
            );
          })}
      </SurfaceCard>
    </div>
  );
}

// ─── Share Bill Button ────────────────────────────────────────────────────────

function ShareBillButton({ group }) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const balances = group.balances || [];
  const gc = groupCurrencyOf(group);
  const totalSpend = (group.groupExpenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], `${group.name}-bill.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${group.name} bill summary` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${group.name}-bill.png`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
    setSharing(false);
  }

  return (
    <>
      {/* Off-screen card captured by html2canvas */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={cardRef} style={{ width: 360, padding: 24, background: '#fff', fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>{group.icon || '👥'}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 20, color: '#111' }}>{group.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>Total spend: {fmt(totalSpend, gc)}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            {balances.map((b) => {
              const n = Number(b.net || 0);
              return (
                <div key={b.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>{b.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : '#9ca3af' }}>
                    {n > 0 ? `Gets back ${fmt(n, gc)}` : n < 0 ? `Owes ${fmt(Math.abs(n), gc)}` : 'Settled ✓'}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 11, color: '#d1d5db', textAlign: 'center' }}>Generated by HisabKitab</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleShare}
        disabled={sharing || balances.length === 0}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '13px 16px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: 'pointer',
          opacity: (sharing || balances.length === 0) ? 0.4 : 1,
        }}
      >
        {sharing ? '⏳ Generating image…' : '📸 Share bill as image'}
      </button>
    </>
  );
}

// ─── Balances Tab ─────────────────────────────────────────────────────────────

function groupCurrencyOf(group) {
  const expenses = group.groupExpenses || [];
  if (!expenses.length) return 'INR';
  const counts = {};
  for (const e of expenses) { const c = e.currency || 'INR'; counts[c] = (counts[c] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'INR';
}

// Weighted-average frozen rate for the dominant group currency.
// Each expense contributes its rateAtTime weighted by its amount.
// Returns null for INR groups or mixed-currency groups.
function groupFrozenRate(group, rateMap) {
  const gc = groupCurrencyOf(group);
  if (gc === 'INR') return null;
  const expenses = (group.groupExpenses || []).filter((e) => (e.currency || 'INR') === gc);
  if (!expenses.length) return rateMap[gc] || null;
  const totalAmt = expenses.reduce((s, e) => s + Number(e.amount), 0);
  if (!totalAmt) return rateMap[gc] || null;
  const totalInr = expenses.reduce((s, e) => {
    const rate = e.rateAtTime != null ? Number(e.rateAtTime) : (rateMap[gc] || 0);
    return s + Number(e.amount) * rate;
  }, 0);
  return totalInr / totalAmt;
}

function BalancesTab({ group, currentUser }) {
  const { t } = useTranslation();
  const balances = group.balances || [];
  const gc = groupCurrencyOf(group);
  const rateMap = useRateMap();
  const gcRate = groupFrozenRate(group, rateMap);
  const totalSpend = (group.groupExpenses || []).reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );
  const hasMixedCurrency = new Set((group.groupExpenses || []).map(e => e.currency || 'INR')).size > 1;

  return (
    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hasMixedCurrency && (
        <SurfaceCard style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p style={{ fontSize: 12, color: '#92400E', fontWeight: 500, margin: 0 }}>⚠️ Mixed currencies — balances are summed as-is without conversion</p>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Total group spend</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{fmt(totalSpend, gc)}</p>
        </div>
      </SurfaceCard>

      {balances.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 8 }}>
          <span style={{ fontSize: 40 }}>⚖️</span>
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No balance data yet</p>
        </div>
      ) : (
        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {balances.map((b, idx) => {
            const n = Number(b.net || 0);
            const isMe = b.userId === currentUser?.uid;
            const amtColor = n > 0 ? '#059669' : n < 0 ? '#E11D48' : '#9CA3AF';
            const avatarBg = n > 0
              ? 'linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)'
              : n < 0
                ? 'linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)'
                : '#F0F2F7';
            const avatarColor = n > 0 ? '#065F46' : n < 0 ? '#991B1B' : '#6B7280';

            const rightSlot = (
              <div style={{ textAlign: 'right' }}>
                {n > 0 ? (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', margin: 0 }}>Gets back {fmt(n, gc)}</p>
                    {gcRate && <p style={{ fontSize: 10, color: '#B0B8C4', margin: '2px 0 0' }}>≈ {fmt(n * gcRate, 'INR')}</p>}
                  </>
                ) : n < 0 ? (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#E11D48', margin: 0 }}>Owes {fmt(Math.abs(n), gc)}</p>
                    {gcRate && <p style={{ fontSize: 10, color: '#B0B8C4', margin: '2px 0 0' }}>≈ {fmt(Math.abs(n) * gcRate, 'INR')}</p>}
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>{t('balance.settled')}</span>
                )}
              </div>
            );

            return (
              <TransactionRow
                key={b.memberId}
                icon={initials(b.name)}
                iconBg={avatarBg}
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0A0D14' }}>{b.name}</span>
                    {isMe && <Badge variant="active" label="You" />}
                  </span>
                }
                subtitle={null}
                isLast={idx === balances.length - 1}
                rightSlot={rightSlot}
              />
            );
          })}
        </SurfaceCard>
      )}

      <ShareBillButton group={group} />
    </div>
  );
}

// ─── Settle Up Tab ────────────────────────────────────────────────────────────

function SettleUpTab({ group }) {
  const { t } = useTranslation();
  const [confirmTx, setConfirmTx] = useState(null);
  const recordSettlement = useRecordSettlement(group.id);
  const plan = group.settlePlan || [];
  const gc = groupCurrencyOf(group);
  const rateMap = useRateMap();
  const gcRate = groupFrozenRate(group, rateMap);

  function handleConfirm() {
    if (!confirmTx) return;
    recordSettlement.mutate(
      {
        fromMemberId: confirmTx.fromMemberId,
        toMemberId: confirmTx.toMemberId,
        amount: confirmTx.amount,
      },
      {
        onSuccess: () => setConfirmTx(null),
      }
    );
  }

  if (plan.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 16px', gap: 12 }}>
        <span style={{ fontSize: 48 }}>🎉</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>All settled up!</p>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No payments needed.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {plan.map((tx, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '13px 16px',
                borderBottom: i === plan.length - 1 ? 'none' : '1px solid #F0F2F7',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>{tx.fromName}</span>
                  <span style={{ color: '#9CA3AF', fontSize: 14 }}>→</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>{tx.toName}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#009E90', margin: '2px 0 0' }}>{fmt(tx.amount, gc)}</p>
                {gcRate && <p style={{ fontSize: 10, color: '#B0B8C4', margin: '2px 0 0' }}>≈ {fmt(tx.amount * gcRate, 'INR')}</p>}
              </div>
              <button
                onClick={() => setConfirmTx(tx)}
                style={{
                  padding: '8px 16px',
                  background: '#E6FAF9',
                  color: '#009E90',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Settle
              </button>
            </div>
          ))}
        </SurfaceCard>
      </div>

      {/* Confirmation bottom sheet */}
      {confirmTx && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setConfirmTx(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-3xl p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 9999, margin: '0 auto 20px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0D14', textAlign: 'center', marginBottom: 8 }}>
              Record settlement?
            </p>
            <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
              Record that{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>{confirmTx.fromName}</span> paid{' '}
              <span style={{ fontWeight: 600, color: '#374151' }}>{confirmTx.toName}</span>{' '}
              <span style={{ fontWeight: 600, color: '#009E90' }}>{fmt(confirmTx.amount, gc)}</span>?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmTx(null)}
                style={{ flex: 1, padding: '13px 16px', borderRadius: 16, background: '#F0F2F7', color: '#374151', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={recordSettlement.isPending}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: recordSettlement.isPending ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {recordSettlement.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Add Expense Sheet ────────────────────────────────────────────────────────

function AddExpenseSheet({ group, currentUser, onClose }) {
  const { t } = useTranslation();
  const addExpense = useAddGroupExpense(group.id);
  const members = group.members || [];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidByMemberId, setPaidByMemberId] = useState(() => {
    const me = members.find((m) => m.userId === currentUser?.uid);
    return me?.id || members[0]?.id || '';
  });
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'amount' | 'percent'
  const [customSplits, setCustomSplits] = useState({});
  const [note, setNote] = useState('');

  const sym = currencySymbol(currency);

  const numAmount = parseFloat(amount) || 0;
  const equalShare = members.length > 0 ? numAmount / members.length : 0;
  const totalCustom = splitMode === 'amount'
    ? members.reduce((s, m) => s + (parseFloat(customSplits[m.id]) || 0), 0)
    : members.reduce((s, m) => s + (parseFloat(customSplits[m.id]) || 0), 0);
  const percentOk = splitMode === 'percent' && Math.abs(totalCustom - 100) < 0.01;
  const amountOk = splitMode === 'amount' && Math.abs(totalCustom - numAmount) < 0.01;

  function handleSubmit() {
    if (!title.trim() || numAmount <= 0) return;
    if (splitMode === 'percent' && !percentOk) return;
    if (splitMode === 'amount' && !amountOk) return;

    const shares = splitMode === 'equal'
      ? members.map((m) => ({ memberId: m.id, amount: equalShare }))
      : splitMode === 'percent'
        ? members.map((m) => ({ memberId: m.id, amount: Math.round((parseFloat(customSplits[m.id] || 0) / 100) * numAmount * 100) / 100 }))
        : members.map((m) => ({ memberId: m.id, amount: parseFloat(customSplits[m.id] || 0) }));

    addExpense.mutate(
      {
        title: title.trim(),
        amount: numAmount,
        currency,
        expenseDate,
        paidByMemberId,
        splitType: splitMode === 'equal' ? 'EQUAL' : 'EXACT',
        note: note.trim() || undefined,
        shares,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  }

  const sheetInputStyle = {
    width: '100%',
    background: '#F0F2F7',
    borderRadius: 14,
    padding: '12px 16px',
    fontSize: 14,
    color: '#0A0D14',
    border: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        style={{ position: 'relative', width: '100%', background: '#fff', borderRadius: '24px 24px 0 0', zIndex: 10, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'sticky', top: 0, background: '#fff', padding: '16px 20px 12px', borderBottom: '1px solid #F0F2F7' }}>
          <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 9999, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t('home.add_expense')}</p>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: '0 4px' }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Taj"
              style={sheetInputStyle}
            />
          </div>

          {/* Amount + Currency */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
                  {sym}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  style={{ ...sheetInputStyle, paddingLeft: 32 }}
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ ...sheetInputStyle, width: 'auto', paddingLeft: 12, paddingRight: 12 }}
              >
                {['INR','THB','USD','EUR','GBP','AED','SGD','JPY','MYR','CAD','AUD'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              style={sheetInputStyle}
            />
          </div>

          {/* Paid by */}
          <div>
            <label style={labelStyle}>Paid by</label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaidByMemberId(m.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 99,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: paidByMemberId === m.id
                      ? 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)'
                      : '#F0F2F7',
                    color: paidByMemberId === m.id ? '#fff' : '#374151',
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {initials(m.name)[0]}
                  </span>
                  {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div>
            <label style={labelStyle}>Split</label>
            <div style={{ display: 'flex', gap: 4, background: '#F0F2F7', borderRadius: 12, padding: 4, marginBottom: 12 }}>
              {[['equal', 'Equal'], ['amount', 'By ₹'], ['percent', 'By %']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setSplitMode(mode); setCustomSplits({}); }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: splitMode === mode ? '#fff' : 'transparent',
                    color: splitMode === mode ? '#009E90' : '#6B7280',
                    boxShadow: splitMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {splitMode === 'equal' && numAmount > 0 && (
              <p style={{ fontSize: 13, color: '#6B7280', background: '#F0F2F7', borderRadius: 12, padding: '10px 14px' }}>
                {fmt(equalShare, currency)} per person ({members.length} members)
              </p>
            )}

            {(splitMode === 'amount' || splitMode === 'percent') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: '#374151', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]}</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 13 }}>
                        {splitMode === 'percent' ? '%' : sym}
                      </span>
                      <input
                        type="number"
                        value={customSplits[m.id] || ''}
                        onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="0"
                        style={{ ...sheetInputStyle, paddingLeft: 28, padding: '8px 12px 8px 28px' }}
                      />
                    </div>
                    {splitMode === 'percent' && customSplits[m.id] && numAmount > 0 && (
                      <span style={{ fontSize: 11, color: '#9CA3AF', width: 64, textAlign: 'right', flexShrink: 0 }}>
                        {fmt((parseFloat(customSplits[m.id]) / 100) * numAmount, currency)}
                      </span>
                    )}
                  </div>
                ))}
                <div style={{
                  fontSize: 12,
                  textAlign: 'right',
                  color: splitMode === 'percent'
                    ? percentOk ? '#059669' : '#E11D48'
                    : amountOk ? '#059669' : '#E11D48',
                  paddingRight: 4,
                }}>
                  {splitMode === 'percent'
                    ? `Total: ${totalCustom.toFixed(1)}% ${percentOk ? '✓' : '(must equal 100%)'}`
                    : `Total: ${fmt(totalCustom, currency)} ${amountOk ? '✓' : `(must equal ${fmt(numAmount, currency)})`}`}
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              style={sheetInputStyle}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || numAmount <= 0 || addExpense.isPending || (splitMode === 'percent' && !percentOk) || (splitMode === 'amount' && !amountOk)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: (!title.trim() || numAmount <= 0 || addExpense.isPending || (splitMode === 'percent' && !percentOk) || (splitMode === 'amount' && !amountOk)) ? 0.4 : 1,
            }}
          >
            {addExpense.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('common.add')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Expenses', 'Balances', 'Settle Up'];

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: group, isLoading } = useGroup(id);

  const [activeTab, setActiveTab] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title="Group" showBack />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title="Group" showBack />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
          <span style={{ fontSize: 40 }}>😕</span>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>Group not found</p>
        </div>
      </div>
    );
  }

  const totalSpend = (group.groupExpenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const gc = groupCurrencyOf(group);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={group.name} showBack />

      {/* Group header — dark navy gradient card */}
      <div style={{ margin: '12px 16px 0', borderRadius: 22, padding: 20, background: 'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
              {(group.members?.length || 0) === 1
                ? t('groups.member_one', { n: 1 })
                : t('groups.member_other', { n: group.members?.length || 0 })}
            </p>
          </div>
          <span style={{ fontSize: 28 }}>{group.icon || TYPE_ICON[group.type] || '👥'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total spend</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>{fmt(totalSpend, gc)}</p>
          </div>
          <MemberAvatarsRow members={group.members || []} max={5} />
        </div>
      </div>

      {/* Sticky tabs */}
      <div style={{
        position: 'sticky',
        top: 56,
        zIndex: 10,
        background: '#F0F2F7',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 14,
                fontWeight: 700,
                color: activeTab === i ? '#009E90' : '#9CA3AF',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === i ? '2px solid #009E90' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {activeTab === 0 && (
          <ExpensesTab group={group} currentUser={user} />
        )}
        {activeTab === 1 && (
          <BalancesTab group={group} currentUser={user} />
        )}
        {activeTab === 2 && (
          <SettleUpTab group={group} />
        )}
      </div>

      {/* FAB — only show on Expenses tab */}
      {activeTab === 0 && (
        <button
          onClick={() => setShowAddExpense(true)}
          style={{
            position: 'fixed',
            bottom: 112,
            right: 16,
            zIndex: 20,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
            color: '#fff',
            borderRadius: 18,
            boxShadow: '0 4px 16px rgba(0,158,144,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 300,
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Add expense"
        >
          +
        </button>
      )}

      {/* Add Expense Sheet */}
      {showAddExpense && (
        <AddExpenseSheet
          group={group}
          currentUser={user}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </div>
  );
}
