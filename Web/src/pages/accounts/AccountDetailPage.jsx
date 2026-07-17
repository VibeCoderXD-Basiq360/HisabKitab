import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import TransactionRow from '../../components/ui/TransactionRow';
import HeroCard from '../../components/ui/HeroCard';
import { useAccountLedger, useAccounts, usePayCreditCardBill, useCreateTransfer } from '../../hooks/useAccounts';

const TYPE_META = {
  SAVINGS:     { icon: '🏦', label: 'Savings' },
  CURRENT:     { icon: '🧾', label: 'Current' },
  CREDIT_CARD: { icon: '💳', label: 'Credit Card' },
  CASH:        { icon: '💵', label: 'Cash' },
  WALLET:      { icon: '👛', label: 'Wallet' },
  METRO_CARD:  { icon: '🚇', label: 'Metro Card' },
  OTHER:       { icon: '💰', label: 'Other' },
};

const fmt = (n) =>
  `₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Sheet input style ─── */
const sheetInput = {
  width: '100%',
  background: '#F0F2F7',
  border: '1.5px solid #E9ECF0',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 15,
  color: '#0A0D14',
  outline: 'none',
  boxSizing: 'border-box',
};

const sheetLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: '#B0B8C4',
  display: 'block',
  marginBottom: 4,
};

function PayBillSheet({ cardId, cardName, outstanding, bankAccounts, onClose }) {
  const [amount, setAmount]       = useState('');
  const [fromId, setFromId]       = useState(bankAccounts[0]?.id || '');
  const [date, setDate]           = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote]           = useState('');
  const payBill = usePayCreditCardBill();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    await payBill.mutateAsync({
      id: cardId,
      amount: Number(amount),
      fromAccountId: fromId || undefined,
      paymentDate: date,
      note: note || undefined,
    });
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.50)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 9999, margin: '0 auto' }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Pay Credit Card Bill</h2>

        {/* Outstanding reminder */}
        <div style={{ background: '#FFF1F4', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#E11D48', fontWeight: 600 }}>{cardName} outstanding</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#E11D48' }}>{fmt(outstanding)}</span>
        </div>

        {/* Amount */}
        <div>
          <label style={sheetLabel}>Payment Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(Number(outstanding).toFixed(2))}
            style={{ ...sheetInput, fontSize: 18, fontWeight: 800 }}
            autoFocus
            required
          />
          {outstanding > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(Number(outstanding).toFixed(2)))}
              style={{ marginTop: 4, fontSize: 12, color: '#00C2B2', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Pay full outstanding ({fmt(outstanding)})
            </button>
          )}
        </div>

        {/* Pay from account */}
        {bankAccounts.length > 0 && (
          <div>
            <label style={sheetLabel}>Pay From Account</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              style={sheetInput}
            >
              <option value="">Don't track source account</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {TYPE_META[a.type]?.icon} {a.name} – {fmt(a.balance)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date + Note */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={sheetInput} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. June bill" style={sheetInput} />
          </div>
        </div>

        {payBill.error && (
          <p style={{ fontSize: 12, color: '#E11D48', margin: 0 }}>{payBill.error.response?.data?.error || 'Failed to record payment'}</p>
        )}

        <button
          type="submit"
          disabled={payBill.isPending || !amount}
          style={{ width: '100%', height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', opacity: (payBill.isPending || !amount) ? 0.4 : 1 }}
        >
          {payBill.isPending ? 'Recording…' : `Record Payment${amount ? ' of ' + fmt(amount) : ''}`}
        </button>
      </form>
    </div>
  );
}

function CashWithdrawSheet({ fromAccount, cashAccounts, onClose }) {
  const first = cashAccounts[0];
  const [toId, setToId]     = useState(first?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote]     = useState('Cash Withdrawal');
  const createTransfer = useCreateTransfer();

  const toAcct = cashAccounts.find((a) => a.id === toId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!toId || !amount || Number(amount) <= 0) return;
    await createTransfer.mutateAsync({
      fromAccountId: fromAccount.id,
      toAccountId:   toId,
      amount:        Number(amount),
      transferDate:  date,
      note:          note.trim() || 'Cash Withdrawal',
    });
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.50)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 9999, margin: '0 auto' }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Withdraw Cash</h2>

        {/* From (locked) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F0F2F7', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#B0B8C4', margin: '0 0 2px' }}>From</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
              {TYPE_META[fromAccount.type]?.icon} {fromAccount.name}
            </p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{fmt(Number(fromAccount.balance))}</p>
        </div>

        {/* To */}
        {cashAccounts.length === 0 ? (
          <p style={{ fontSize: 14, color: '#B0B8C4', textAlign: 'center', margin: 0 }}>
            No wallet, cash, or metro card account found. Add one in Accounts first.
          </p>
        ) : (
          <div>
            <label style={sheetLabel}>To (Wallet / Cash / Metro Card)</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} style={sheetInput}>
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {TYPE_META[a.type]?.icon} {a.name} – {fmt(Number(a.balance))}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label style={sheetLabel}>Amount (₹)</label>
          <input
            type="number" min="1" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00" autoFocus
            style={{ ...sheetInput, fontSize: 18, fontWeight: 800 }}
          />
        </div>

        {/* Date + Note */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={sheetInput} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Note</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={sheetInput} />
          </div>
        </div>

        {/* Balance preview */}
        {toAcct && amount && Number(amount) > 0 && (
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#1D4ED8', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0 }}><strong>{fromAccount.name}</strong> {fmt(Number(fromAccount.balance))} → {fmt(Number(fromAccount.balance) - Number(amount))}</p>
            <p style={{ margin: 0 }}><strong>{toAcct.name}</strong> {fmt(Number(toAcct.balance))} → {fmt(Number(toAcct.balance) + Number(amount))}</p>
          </div>
        )}

        {createTransfer.error && (
          <p style={{ fontSize: 12, color: '#E11D48', margin: 0 }}>{createTransfer.error.response?.data?.error || 'Transfer failed'}</p>
        )}

        <button
          type="submit"
          disabled={!toId || !amount || Number(amount) <= 0 || cashAccounts.length === 0 || createTransfer.isPending}
          style={{ width: '100%', height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', opacity: (!toId || !amount || Number(amount) <= 0 || cashAccounts.length === 0 || createTransfer.isPending) ? 0.4 : 1 }}
        >
          {createTransfer.isPending ? 'Processing…' : `Withdraw${amount ? ' ' + fmt(amount) : ''}`}
        </button>
      </form>
    </div>
  );
}

function TopUpSheet({ toAccount, sourceAccounts, onClose }) {
  const first = sourceAccounts[0];
  const [fromId, setFromId]   = useState(first?.id || '');
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote]       = useState('Metro Card Top Up');
  const createTransfer = useCreateTransfer();

  const fromAcct = sourceAccounts.find((a) => a.id === fromId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fromId || !amount || Number(amount) <= 0) return;
    await createTransfer.mutateAsync({
      fromAccountId: fromId,
      toAccountId:   toAccount.id,
      amount:        Number(amount),
      transferDate:  date,
      note:          note.trim() || 'Metro Card Top Up',
    });
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.50)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 9999, margin: '0 auto' }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>🚇 Top Up Metro Card</h2>

        {/* From (bank account selector) */}
        {sourceAccounts.length === 0 ? (
          <p style={{ fontSize: 14, color: '#B0B8C4', textAlign: 'center', margin: 0 }}>
            No savings or current account found. Add one in Accounts first.
          </p>
        ) : (
          <div>
            <label style={sheetLabel}>From (Bank Account)</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={sheetInput}>
              {sourceAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {TYPE_META[a.type]?.icon} {a.name} – {fmt(Number(a.balance))}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* To (locked metro card) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F0F2F7', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#B0B8C4', margin: '0 0 2px' }}>To</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
              {TYPE_META[toAccount.type]?.icon} {toAccount.name}
            </p>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{fmt(Number(toAccount.balance))}</p>
        </div>

        {/* Amount */}
        <div>
          <label style={sheetLabel}>Amount (₹)</label>
          <input
            type="number" min="1" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00" autoFocus
            style={{ ...sheetInput, fontSize: 18, fontWeight: 800 }}
          />
        </div>

        {/* Date + Note */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={sheetInput} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={sheetLabel}>Note</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={sheetInput} />
          </div>
        </div>

        {/* Balance preview */}
        {fromAcct && amount && Number(amount) > 0 && (
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#1D4ED8', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0 }}><strong>{fromAcct.name}</strong> {fmt(Number(fromAcct.balance))} → {fmt(Number(fromAcct.balance) - Number(amount))}</p>
            <p style={{ margin: 0 }}><strong>{toAccount.name}</strong> {fmt(Number(toAccount.balance))} → {fmt(Number(toAccount.balance) + Number(amount))}</p>
          </div>
        )}

        {createTransfer.error && (
          <p style={{ fontSize: 12, color: '#E11D48', margin: 0 }}>{createTransfer.error.response?.data?.error || 'Transfer failed'}</p>
        )}

        <button
          type="submit"
          disabled={!fromId || !amount || Number(amount) <= 0 || sourceAccounts.length === 0 || createTransfer.isPending}
          style={{ width: '100%', height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', opacity: (!fromId || !amount || Number(amount) <= 0 || sourceAccounts.length === 0 || createTransfer.isPending) ? 0.4 : 1 }}
        >
          {createTransfer.isPending ? 'Processing…' : `Top Up${amount ? ' ' + fmt(amount) : ''}`}
        </button>
      </form>
    </div>
  );
}

export default function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAccountLedger(id);
  const { data: allAccounts = [] } = useAccounts();
  const [showPayBill, setShowPayBill]     = useState(false);
  const [showWithdraw, setShowWithdraw]   = useState(false);
  const [showTopUp, setShowTopUp]         = useState(false);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#F0F2F7', paddingBottom: 32 }}>
      <TopBar title="Account" showBack onBack={() => navigate(-1)} />
      <p style={{ textAlign: 'center', color: '#B0B8C4', paddingTop: 48 }}>Loading…</p>
    </div>
  );

  if (!data) return null;

  const { account, transactions } = data;
  const meta   = TYPE_META[account.type] || TYPE_META.OTHER;
  const isCC   = account.type === 'CREDIT_CARD';
  const bal    = Number(account.balance);
  const isNeg  = bal < 0;

  const bankAccounts   = allAccounts.filter((a) => a.id !== id && a.type !== 'CREDIT_CARD' && a.isActive !== false);
  const cashAccounts   = allAccounts.filter((a) => a.id !== id && (a.type === 'WALLET' || a.type === 'CASH' || a.type === 'METRO_CARD') && a.isActive !== false);
  const isBankAccount  = account.type === 'SAVINGS' || account.type === 'CURRENT';
  const isMetroCard    = account.type === 'METRO_CARD';
  const sourceAccounts = allAccounts.filter((a) => a.id !== id && (a.type === 'SAVINGS' || a.type === 'CURRENT') && a.isActive !== false);

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F7', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title={account.name} showBack onBack={() => navigate(-1)} />

      {/* Hero card */}
      <div style={{ padding: '12px 16px 0' }}>
        <HeroCard>
          {/* Account name + action button row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{meta.icon}</span>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{account.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
                  {meta.label} · {isCC ? 'Opening outstanding' : 'Opening'} ₹{Number(account.openingBalance).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            {isCC && (
              <button
                onClick={() => setShowPayBill(true)}
                style={{ background: '#00C2B2', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Pay Bill
              </button>
            )}
            {isBankAccount && (
              <button
                onClick={() => setShowWithdraw(true)}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                💵 Withdraw
              </button>
            )}
            {isMetroCard && (
              <button
                onClick={() => setShowTopUp(true)}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                🚇 Top Up
              </button>
            )}
          </div>

          {/* Balance */}
          {isCC ? (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>Outstanding</p>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '4px 0 2px' }}>{fmt(bal)}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Amount owed to the bank</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>Current Balance</p>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>
                {isNeg ? '-' : ''}{fmt(bal)}
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {isCC ? (
              <>
                <div style={{ flex: 1, background: 'rgba(225,29,72,0.18)', borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 600, margin: '0 0 4px' }}>Total Purchases</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>
                    {fmt(transactions.filter((t) => t._type === 'expense').reduce((s, t) => s + Number(t.amount), 0))}
                  </p>
                </div>
                <div style={{ flex: 1, background: 'rgba(5,150,105,0.18)', borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: '#6EE7B7', fontWeight: 600, margin: '0 0 4px' }}>Total Paid</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>
                    {fmt(transactions.filter((t) => t._type === 'cc_payment').reduce((s, t) => s + Number(t.amount), 0))}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1, background: 'rgba(5,150,105,0.18)', borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: '#6EE7B7', fontWeight: 600, margin: '0 0 4px' }}>Total In</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>
                    {fmt(transactions.filter((t) => t._type === 'income' || t._type === 'transfer_in').reduce((s, t) => s + Number(t.amount), 0))}
                  </p>
                </div>
                <div style={{ flex: 1, background: 'rgba(225,29,72,0.18)', borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 600, margin: '0 0 4px' }}>Total Out</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>
                    {fmt(transactions.filter((t) => !['income','transfer_in'].includes(t._type)).reduce((s, t) => s + Number(t.amount), 0))}
                  </p>
                </div>
              </>
            )}
          </div>
        </HeroCard>
      </div>

      {/* Ledger */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
          {transactions.length} Transactions
        </p>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>{isCC ? '💳' : '📋'}</p>
            <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>No transactions yet.</p>
            <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4 }}>
              {isCC
                ? 'Tag expenses to this card to track purchases.'
                : 'Tag expenses or income to this account to see them here.'}
            </p>
          </div>
        ) : (
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {transactions.map((txn, i) => {
              const isIncome    = txn._type === 'income';
              const isCCPay     = txn._type === 'cc_payment';
              const isCCPaySent = txn._type === 'cc_payment_sent';
              const date = new Date(
                isIncome ? txn.incomeDate
                : isCCPay || isCCPaySent ? txn.paymentDate
                : txn._type === 'transfer_in' || txn._type === 'transfer_out' ? txn.transferDate
                : txn._type === 'biz_expense' ? txn.date
                : txn.expenseDate
              );
              const runBal = Number(txn.runningBalance);

              const isXferIn  = txn._type === 'transfer_in';
              const isXferOut = txn._type === 'transfer_out';
              const isBizExp  = txn._type === 'biz_expense';

              let icon, label, sublabel, isIncomeRow, iconBg;
              if (isIncome) {
                icon = '↓'; label = txn.title; sublabel = txn.source || 'Income';
                isIncomeRow = true; iconBg = '#D1FAE5';
              } else if (isCCPay) {
                icon = '✔'; label = txn.note || 'Bill Payment';
                sublabel = txn.fromAccount ? `From ${txn.fromAccount.name}` : 'Payment';
                isIncomeRow = true; iconBg = '#D1FAE5';
              } else if (isCCPaySent) {
                icon = '↑'; label = txn.note || 'CC Bill Payment';
                sublabel = `To ${txn.creditCardAccount?.name || 'Credit Card'}`;
                isIncomeRow = false; iconBg = '#FEF3C7';
              } else if (isXferIn) {
                icon = '↙'; label = txn.note || 'Transfer Received';
                sublabel = `From ${txn.fromAccount?.name || 'Account'}`;
                isIncomeRow = true; iconBg = '#D1FAE5';
              } else if (isXferOut) {
                icon = '↗'; label = txn.note || 'Transfer Sent';
                sublabel = `To ${txn.toAccount?.name || 'Account'}`;
                isIncomeRow = false; iconBg = '#DBEAFE';
              } else if (isBizExp) {
                icon = '🏭'; label = txn.vendor || txn.category;
                sublabel = `Business · ${txn.category}${txn.location?.name ? ` · ${txn.location.name}` : ''}`;
                isIncomeRow = false; iconBg = '#EDE9FE';
              } else {
                icon = '↑'; label = txn.title;
                sublabel = txn.category?.name || '';
                isIncomeRow = false; iconBg = '#FFE4E6';
              }

              const balColor = isXferOut ? '#3B82F6' : isBizExp ? '#7C3AED' : isCCPaySent ? '#F59E0B' : undefined;

              return (
                <TransactionRow
                  key={txn.id}
                  icon={icon}
                  iconBg={iconBg}
                  title={label}
                  subtitle={`${format(date, 'd MMM yyyy')}${sublabel ? ` · ${sublabel}` : ''}`}
                  amount={fmt(txn.amount)}
                  isIncome={isIncomeRow}
                  isLast={i === transactions.length - 1}
                  rightSlot={
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: balColor || (isIncomeRow ? '#059669' : '#E11D48'), letterSpacing: '-0.3px' }}>
                        {isIncomeRow ? '+' : '-'}{fmt(txn.amount)}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: runBal < 0 ? '#E11D48' : '#B0B8C4' }}>
                        {isCC ? 'Owed: ' : 'Bal: '}{runBal < 0 ? '-' : ''}{fmt(runBal)}
                      </span>
                    </div>
                  }
                />
              );
            })}
          </SurfaceCard>
        )}
      </div>

      {showPayBill && (
        <PayBillSheet
          cardId={account.id}
          cardName={account.name}
          outstanding={bal}
          bankAccounts={bankAccounts}
          onClose={() => setShowPayBill(false)}
        />
      )}

      {showWithdraw && (
        <CashWithdrawSheet
          fromAccount={{ ...account, balance: bal }}
          cashAccounts={cashAccounts}
          onClose={() => setShowWithdraw(false)}
        />
      )}
      {showTopUp && (
        <TopUpSheet
          toAccount={{ ...account, balance: bal }}
          sourceAccounts={sourceAccounts}
          onClose={() => setShowTopUp(false)}
        />
      )}
    </div>
  );
}
