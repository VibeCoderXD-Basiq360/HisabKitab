import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useCreateTransfer } from '../../hooks/useAccounts';
import { format } from 'date-fns';

const TYPE_META = {
  SAVINGS:     { icon: '🏦', label: 'Savings',     border: '#00C2B2' },
  CURRENT:     { icon: '🧾', label: 'Current',     border: '#0B1A38' },
  CREDIT_CARD: { icon: '💳', label: 'Credit Card', border: '#7C3AED' },
  CASH:        { icon: '💵', label: 'Cash',        border: '#F59E0B' },
  WALLET:      { icon: '👛', label: 'Wallet',      border: '#F59E0B' },
  METRO_CARD:  { icon: '🚇', label: 'Metro Card',  border: '#6366F1' },
  OTHER:       { icon: '💰', label: 'Other',       border: '#B0B8C4' },
};

const TYPES = Object.entries(TYPE_META);

const fmt = (n) =>
  `₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = { name: '', type: 'SAVINGS', openingBalance: '', icon: '', color: '' };

/* ─── AccountForm sheet ─────────────────────────────────────────────────── */
function AccountForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 999, margin: '0 auto' }} />

        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
          {initial ? 'Edit Account' : 'Add Account'}
        </h2>

        {/* Name */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 6 }}>Account Name</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. SBI Savings, HDFC Credit"
            style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 8 }}>Account Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TYPES.map(([key, { icon, label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('type', key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 4px', borderRadius: 12, border: '1.5px solid',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  background: form.type === key ? '#00C2B2' : '#F8F9FB',
                  borderColor: form.type === key ? '#00C2B2' : '#E9ECF0',
                  color: form.type === key ? '#FFFFFF' : '#374151',
                }}
              >
                <span style={{ fontSize: 18, marginBottom: 2 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Opening Balance */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 6 }}>
            {form.type === 'CREDIT_CARD'
              ? <>Opening Outstanding (₹) <span style={{ fontWeight: 400 }}>— amount already owed before tracking</span></>
              : <>Opening Balance (₹) <span style={{ fontWeight: 400 }}>— current balance if starting now</span></>
            }
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.openingBalance}
            onChange={(e) => set('openingBalance', e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={() => { if (form.name) onSave(form); }}
          disabled={!form.name || saving}
          style={{
            width: '100%', height: 48, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #00C2B2 0%, #00A89A 100%)',
            color: '#FFFFFF', fontWeight: 700, fontSize: 14, opacity: (!form.name || saving) ? 0.4 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Account'}
        </button>
      </div>
    </div>
  );
}

/* ─── TransferSheet ─────────────────────────────────────────────────────── */
function TransferSheet({ accounts, onClose }) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId]     = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote]     = useState('');
  const createTransfer = useCreateTransfer();

  const from = accounts.find((a) => a.id === fromId);
  const to   = accounts.find((a) => a.id === toId);

  const inputStyle = {
    width: '100%', background: '#E9ECF0', borderRadius: 12,
    padding: '10px 12px', fontSize: 14, color: '#0A0D14',
    border: 'none', outline: 'none', boxSizing: 'border-box',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId || !amount || Number(amount) <= 0) return;
    await createTransfer.mutateAsync({ fromAccountId: fromId, toAccountId: toId, amount: Number(amount), transferDate: date, note: note || undefined });
    onClose();
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: '28px 28px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 999, margin: '0 auto' }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Transfer Between Accounts</h2>

        {/* From → To */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4' }}>From</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              style={{ ...inputStyle }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{TYPE_META[a.type]?.icon} {a.name}</option>
              ))}
            </select>
            {from && <p style={{ fontSize: 11, color: '#B0B8C4', paddingLeft: 4 }}>Balance: {fmt(from.balance)}</p>}
          </div>

          <div style={{ color: '#B0B8C4', fontSize: 20, marginTop: 16 }}>→</div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4' }}>To</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              style={{ ...inputStyle }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{TYPE_META[a.type]?.icon} {a.name}</option>
              ))}
            </select>
            {to && <p style={{ fontSize: 11, color: '#B0B8C4', paddingLeft: 4 }}>Balance: {fmt(to.balance)}</p>}
          </div>
        </div>

        {fromId === toId && (
          <p style={{ fontSize: 12, color: '#E11D48' }}>From and To accounts must be different</p>
        )}

        {/* Amount */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 6 }}>Amount (₹)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            style={{ ...inputStyle, fontSize: 20, fontWeight: 800 }}
          />
        </div>

        {/* Date + Note */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 6 }}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. ATM withdrawal"
              style={{ ...inputStyle }}
            />
          </div>
        </div>

        {/* Preview */}
        {from && to && amount && Number(amount) > 0 && fromId !== toId && (
          <div style={{ background: '#E6FAF9', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#00C2B2' }}>
            <span style={{ fontWeight: 700 }}>{from.name}</span> {fmt(from.balance)} → {fmt(Number(from.balance) - Number(amount))}
            <br />
            <span style={{ fontWeight: 700 }}>{to.name}</span> {fmt(to.balance)} → {fmt(Number(to.balance) + Number(amount))}
          </div>
        )}

        {createTransfer.error && (
          <p style={{ fontSize: 12, color: '#E11D48' }}>{createTransfer.error.response?.data?.error || 'Transfer failed'}</p>
        )}

        <button
          type="submit"
          disabled={!fromId || !toId || fromId === toId || !amount || Number(amount) <= 0 || createTransfer.isPending}
          style={{
            width: '100%', height: 48, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #00C2B2 0%, #00A89A 100%)',
            color: '#FFFFFF', fontWeight: 700, fontSize: 14,
            opacity: (!fromId || !toId || fromId === toId || !amount || Number(amount) <= 0 || createTransfer.isPending) ? 0.4 : 1,
          }}
        >
          {createTransfer.isPending ? 'Transferring…' : `Transfer${amount ? ' ' + fmt(amount) : ''}`}
        </button>
      </form>
    </div>
  );
}

/* ─── AccountsPage ──────────────────────────────────────────────────────── */
export default function AccountsPage() {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const bankAccounts = accounts.filter((a) => a.type !== 'CREDIT_CARD');
  const creditCards  = accounts.filter((a) => a.type === 'CREDIT_CARD');
  const totalAssets  = bankAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalDebt    = creditCards.reduce((s, a) => s + Number(a.balance), 0);
  const netBalance   = totalAssets - totalDebt;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Accounts" showBack onBack={() => navigate(-1)} />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Total Balance Hero ── */}
        <div style={{
          background: 'linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)',
          borderRadius: 22,
          padding: 20,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
            Net Balance
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            {netBalance < 0 ? '-' : ''}{fmt(netBalance)}
          </p>
          {creditCards.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                Assets <span style={{ color: '#34D399', fontWeight: 700 }}>{fmt(totalAssets)}</span>
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                CC Outstanding <span style={{ color: '#F87171', fontWeight: 700 }}>{fmt(totalDebt)}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Account List ── */}
        {isLoading ? (
          <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '32px 0', fontSize: 14 }}>Loading…</p>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏦</p>
            <p style={{ color: '#B0B8C4', fontSize: 14, margin: '0 0 4px' }}>No accounts yet.</p>
            <p style={{ color: '#B0B8C4', fontSize: 12, margin: 0 }}>Add your bank accounts to track balances automatically.</p>
          </div>
        ) : (
          accounts.map((account) => {
            const meta  = TYPE_META[account.type] || TYPE_META.OTHER;
            const bal   = Number(account.balance);
            const isNeg = bal < 0;
            const borderColor = meta.border;

            return (
              <SurfaceCard
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                style={{ padding: 0, overflow: 'hidden', borderRadius: 18 }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderLeft: `3px solid ${borderColor}`,
                  padding: '14px 16px',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: '#E6FAF9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {meta.icon}
                  </div>

                  {/* Name + badge */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 14, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {account.name}
                    </p>
                    <Badge variant="neutral" label={meta.label} />
                  </div>

                  {/* Balance + edit */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {account.type === 'CREDIT_CARD' ? (
                      <>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#E11D48', margin: 0 }}>{fmt(bal)}</p>
                        <p style={{ fontSize: 10, color: '#F87171', fontWeight: 600, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>outstanding</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 22, fontWeight: 800, color: isNeg ? '#E11D48' : '#0A0D14', margin: 0 }}>
                        {isNeg ? '-' : ''}{fmt(bal)}
                      </p>
                    )}
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setEditing(account); }}
                      style={{ fontSize: 12, color: '#00C2B2', fontWeight: 600, cursor: 'pointer', display: 'block', paddingTop: 2 }}
                    >
                      Edit
                    </span>
                  </div>
                </div>
              </SurfaceCard>
            );
          })
        )}

        {/* ── Transfer button ── */}
        {accounts.length >= 2 && (
          <button
            onClick={() => setShowTransfer(true)}
            style={{
              width: '100%', height: 48, borderRadius: 16, border: '1.5px solid #E9ECF0',
              background: '#E6FAF9', color: '#00C2B2', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer',
            }}
          >
            ⇄ Transfer Between Accounts
          </button>
        )}

        {/* ── FAB / Add Account ── */}
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', height: 52, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(90deg, #00C2B2 0%, #00A89A 100%)',
            color: '#FFFFFF', fontWeight: 800, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(0,194,178,0.30)',
          }}
        >
          + Add Account
        </button>
      </div>

      {/* ── Sheets ── */}
      {showForm && (
        <AccountForm
          onSave={async (data) => {
            await createAccount.mutateAsync(data);
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
          saving={createAccount.isPending}
        />
      )}

      {editing && (
        <AccountForm
          initial={{ name: editing.name, type: editing.type, openingBalance: String(Number(editing.openingBalance)), icon: editing.icon || '', color: editing.color || '' }}
          onSave={async (data) => {
            await updateAccount.mutateAsync({ id: editing.id, ...data });
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
          saving={updateAccount.isPending}
        />
      )}

      {showTransfer && (
        <TransferSheet
          accounts={accounts.filter((a) => a.type !== 'CREDIT_CARD')}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}
