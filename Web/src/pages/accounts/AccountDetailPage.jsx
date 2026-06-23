import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAccountLedger, useAccounts, usePayCreditCardBill } from '../../hooks/useAccounts';

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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4 pb-8 flex flex-col gap-4"
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Pay Credit Card Bill</h2>

        {/* Outstanding reminder */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">{cardName} outstanding</span>
          <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(outstanding)}</span>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Payment Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(Number(outstanding).toFixed(2))}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
            required
          />
          {outstanding > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(Number(outstanding).toFixed(2)))}
              className="mt-1 text-xs text-primary-500 font-medium"
            >
              Pay full outstanding ({fmt(outstanding)})
            </button>
          )}
        </div>

        {/* Pay from account */}
        {bankAccounts.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Pay From Account</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">Don't track source account</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {TYPE_META[a.type]?.icon} {a.name} — {fmt(a.balance)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date + Note */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. June bill"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {payBill.error && (
          <p className="text-xs text-red-500">{payBill.error.response?.data?.error || 'Failed to record payment'}</p>
        )}

        <button
          type="submit"
          disabled={payBill.isPending || !amount}
          className="w-full h-12 rounded-xl bg-primary-500 text-white font-bold text-sm disabled:opacity-40"
        >
          {payBill.isPending ? 'Recording…' : `Record Payment${amount ? ' of ' + fmt(amount) : ''}`}
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
  const [showPayBill, setShowPayBill] = useState(false);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Account" showBack onBack={() => navigate(-1)} />
      <p className="text-center text-gray-400 py-12">Loading…</p>
    </div>
  );

  if (!data) return null;

  const { account, transactions } = data;
  const meta   = TYPE_META[account.type] || TYPE_META.OTHER;
  const isCC   = account.type === 'CREDIT_CARD';
  const bal    = Number(account.balance);
  const isNeg  = bal < 0;

  // For the Pay Bill sheet: only show bank/cash/wallet accounts as sources
  const bankAccounts = allAccounts.filter((a) => a.id !== id && a.type !== 'CREDIT_CARD' && a.isActive !== false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title={account.name} showBack onBack={() => navigate(-1)} />

      {/* Account header */}
      <div className="bg-white dark:bg-gray-800 px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{meta.icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
            <p className="text-xs text-gray-400">
              {meta.label} · {isCC ? 'Opening outstanding' : 'Opening'} ₹{Number(account.openingBalance).toLocaleString('en-IN')}
            </p>
          </div>
          {isCC && (
            <button
              onClick={() => setShowPayBill(true)}
              className="bg-primary-500 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0"
            >
              Pay Bill
            </button>
          )}
        </div>

        {isCC ? (
          <div>
            <p className="text-xs text-red-500 uppercase tracking-wide font-semibold">Outstanding</p>
            <p className="text-3xl font-bold mt-0.5 text-red-500">{fmt(bal)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Amount owed to the bank</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Current Balance</p>
            <p className={`text-3xl font-bold mt-0.5 ${isNeg ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
              {isNeg ? '-' : ''}{fmt(bal)}
            </p>
          </div>
        )}

        {/* Quick stats */}
        {isCC ? (
          <div className="flex gap-4 mt-3">
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
              <p className="text-xs text-red-500 font-medium">Total Purchases</p>
              <p className="text-sm font-bold text-red-600">
                {fmt(transactions.filter((t) => t._type === 'expense').reduce((s, t) => s + Number(t.amount), 0))}
              </p>
            </div>
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Paid</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {fmt(transactions.filter((t) => t._type === 'cc_payment').reduce((s, t) => s + Number(t.amount), 0))}
              </p>
            </div>
          </div>
        ) : (
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
                {fmt(transactions.filter((t) => t._type !== 'income').reduce((s, t) => s + Number(t.amount), 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          {transactions.length} Transactions
        </p>

        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">{isCC ? '💳' : '📋'}</p>
            <p className="text-sm text-gray-400">No transactions yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              {isCC
                ? 'Tag expenses to this card to track purchases.'
                : 'Tag expenses or income to this account to see them here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {transactions.map((txn, i) => {
              const isIncome    = txn._type === 'income';
              const isCCPay    = txn._type === 'cc_payment';
              const isCCPaySent = txn._type === 'cc_payment_sent';
              const date = new Date(isIncome ? txn.incomeDate : isCCPay || isCCPaySent ? txn.paymentDate : txn.expenseDate);
              const runBal = Number(txn.runningBalance);

              let icon, label, sublabel, amountColor, amountSign;
              if (isIncome) {
                icon = '↓'; label = txn.title; sublabel = txn.source || 'Income';
                amountColor = 'text-emerald-600'; amountSign = '+';
              } else if (isCCPay) {
                icon = '✓'; label = txn.note || 'Bill Payment';
                sublabel = txn.fromAccount ? `From ${txn.fromAccount.name}` : 'Payment';
                amountColor = 'text-emerald-600'; amountSign = '-';
              } else if (isCCPaySent) {
                icon = '↑'; label = txn.note || 'CC Bill Payment';
                sublabel = `To ${txn.creditCardAccount?.name || 'Credit Card'}`;
                amountColor = 'text-orange-500'; amountSign = '-';
              } else {
                icon = '↑'; label = txn.title;
                sublabel = txn.category?.name || '';
                amountColor = 'text-red-500'; amountSign = '-';
              }

              const dotBg = (isIncome || isCCPay)
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                : isCCPaySent
                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-500';

              return (
                <div
                  key={txn.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < transactions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${dotBg}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{label}</p>
                    <p className="text-xs text-gray-400">
                      {format(date, 'd MMM yyyy')}{sublabel ? ` · ${sublabel}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${amountColor}`}>
                      {amountSign}{fmt(txn.amount)}
                    </p>
                    <p className={`text-xs ${runBal < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {isCC ? 'Owed: ' : 'Bal: '}{runBal < 0 ? '-' : ''}{fmt(runBal)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {showPayBill && (
        <PayBillSheet
          cardId={account.id}
          cardName={account.name}
          outstanding={bal}
          bankAccounts={bankAccounts}
          onClose={() => setShowPayBill(false)}
        />
      )}
    </div>
  );
}
