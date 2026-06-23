import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../../hooks/useAccounts';

const TYPE_META = {
  SAVINGS:     { icon: '🏦', label: 'Savings' },
  CURRENT:     { icon: '🏧', label: 'Current' },
  CREDIT_CARD: { icon: '💳', label: 'Credit Card' },
  CASH:        { icon: '💵', label: 'Cash' },
  WALLET:      { icon: '👛', label: 'Wallet' },
  OTHER:       { icon: '💰', label: 'Other' },
};

const TYPES = Object.entries(TYPE_META);

const fmt = (n) =>
  `₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = { name: '', type: 'SAVINGS', openingBalance: '', icon: '', color: '' };

function AccountForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-t-2xl px-5 pt-4 pb-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {initial ? 'Edit Account' : 'Add Account'}
        </h2>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Account Name</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. SBI Savings, HDFC Credit"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block">Account Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(([key, { icon, label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('type', key)}
                className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  form.type === key
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                <span className="text-lg mb-0.5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Opening Balance */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">
            {form.type === 'CREDIT_CARD'
              ? <>Opening Outstanding (₹) <span className="font-normal text-gray-400">— amount already owed before tracking</span></>
              : <>Opening Balance (₹) <span className="font-normal text-gray-400">— current balance if starting now</span></>
            }
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.openingBalance}
            onChange={(e) => set('openingBalance', e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <button
          onClick={() => { if (form.name) onSave(form); }}
          disabled={!form.name || saving}
          className="w-full h-12 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Account'}
        </button>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const bankAccounts  = accounts.filter((a) => a.type !== 'CREDIT_CARD');
  const creditCards   = accounts.filter((a) => a.type === 'CREDIT_CARD');
  const totalAssets   = bankAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalDebt     = creditCards.reduce((s, a) => s + Number(a.balance), 0);
  const netBalance    = totalAssets - totalDebt;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Accounts" showBack onBack={() => navigate(-1)} />

      {/* Total strip */}
      <div className="bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Net Balance</p>
        <p className={`text-2xl font-bold mt-0.5 ${netBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
          {netBalance < 0 ? '-' : ''}{fmt(netBalance)}
        </p>
        {creditCards.length > 0 && (
          <div className="flex gap-4 mt-2">
            <p className="text-xs text-gray-400">Assets <span className="text-emerald-600 font-semibold">{fmt(totalAssets)}</span></p>
            <p className="text-xs text-gray-400">CC Outstanding <span className="text-red-500 font-semibold">{fmt(totalDebt)}</span></p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-center text-gray-400 py-8">Loading…</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏦</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No accounts yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add your bank accounts to track balances automatically.</p>
          </div>
        ) : (
          accounts.map((account) => {
            const meta = TYPE_META[account.type] || TYPE_META.OTHER;
            const bal = Number(account.balance);
            const isNeg = bal < 0;
            return (
              <div
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-2xl shrink-0">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{account.name}</p>
                  <p className="text-xs text-gray-400">{meta.label}</p>
                </div>
                <div className="text-right shrink-0">
                  {account.type === 'CREDIT_CARD' ? (
                    <>
                      <p className="text-base font-bold text-red-500">{fmt(bal)}</p>
                      <p className="text-[10px] text-red-400 font-medium">outstanding</p>
                    </>
                  ) : (
                    <p className={`text-base font-bold ${isNeg ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      {isNeg ? '-' : ''}{fmt(bal)}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(account); }}
                    className="text-xs text-primary-500 mt-0.5"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })
        )}

        <button
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
        >
          + Add Account
        </button>
      </div>

      <BottomNav />

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
    </div>
  );
}
