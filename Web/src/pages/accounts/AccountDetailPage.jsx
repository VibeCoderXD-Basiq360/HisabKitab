import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAccountLedger } from '../../hooks/useAccounts';

const TYPE_META = {
  SAVINGS:     { icon: '🏦', label: 'Savings' },
  CURRENT:     { icon: '🏧', label: 'Current' },
  CREDIT_CARD: { icon: '💳', label: 'Credit Card' },
  CASH:        { icon: '💵', label: 'Cash' },
  WALLET:      { icon: '👛', label: 'Wallet' },
  OTHER:       { icon: '💰', label: 'Other' },
};

const fmt = (n) =>
  `₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAccountLedger(id);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Account" showBack onBack={() => navigate(-1)} />
      <p className="text-center text-gray-400 py-12">Loading…</p>
    </div>
  );

  if (!data) return null;

  const { account, transactions } = data;
  const meta = TYPE_META[account.type] || TYPE_META.OTHER;
  const bal = Number(account.balance);
  const isNeg = bal < 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title={account.name} showBack onBack={() => navigate(-1)} />

      {/* Account header */}
      <div className="bg-white dark:bg-gray-800 px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
            <p className="text-xs text-gray-400">{meta.label} · Opening ₹{Number(account.openingBalance).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Current Balance</p>
          <p className={`text-3xl font-bold mt-0.5 ${isNeg ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {isNeg ? '-' : ''}{fmt(bal)}
          </p>
        </div>
        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total In</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {fmt(transactions.filter((t) => t._type === 'income').reduce((s, t) => s + Number(t.amount), 0))}
            </p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
            <p className="text-xs text-red-500 font-medium">Total Out</p>
            <p className="text-sm font-bold text-red-600">
              {fmt(transactions.filter((t) => t._type === 'expense').reduce((s, t) => s + Number(t.amount), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          {transactions.length} Transactions
        </p>

        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm text-gray-400">No transactions yet.</p>
            <p className="text-xs text-gray-400 mt-1">Tag expenses or income to this account to see them here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {transactions.map((txn, i) => {
              const isIncome = txn._type === 'income';
              const date = new Date(isIncome ? txn.incomeDate : txn.expenseDate);
              const runBal = Number(txn.runningBalance);
              return (
                <div
                  key={txn.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < transactions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  {/* Type dot */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                    isIncome
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-500'
                  }`}>
                    {isIncome ? '↓' : '↑'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{txn.title}</p>
                    <p className="text-xs text-gray-400">
                      {format(date, 'd MMM yyyy')}
                      {!isIncome && txn.category?.name && ` · ${txn.category.name}`}
                      {isIncome && txn.source && ` · ${txn.source}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isIncome ? '+' : '-'}{fmt(txn.amount)}
                    </p>
                    <p className={`text-xs ${runBal < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      Bal: {runBal < 0 ? '-' : ''}{fmt(runBal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
