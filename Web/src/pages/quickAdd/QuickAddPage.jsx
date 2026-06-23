import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { useCreateExpense } from '../../hooks/useExpenses';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function QuickAddPage() {
  const navigate = useNavigate();
  const { data: categories  = [] } = useCategories();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const createExpense = useCreateExpense();
  const { isOnline, enqueue } = useOfflineQueue();

  const [amount,        setAmount]        = useState('');
  const [categoryId,    setCategoryId]    = useState('');
  const [paymentTypeId, setPaymentTypeId] = useState('');
  const [done,          setDone]          = useState(false);

  const selectedCat = categories.find((c) => c.id === categoryId);
  const canSave = amount && Number(amount) > 0;

  async function handleSave() {
    const title   = selectedCat?.name || 'Expense';
    const payload = {
      title,
      amount:        Number(amount),
      expenseDate:   todayISO(),
      categoryId:    categoryId    || null,
      paymentTypeId: paymentTypeId || null,
    };
    if (!isOnline) {
      enqueue(payload);
    } else {
      await createExpense.mutateAsync(payload);
    }
    setDone(true);
    setTimeout(() => navigate('/'), 1200);
  }

  if (done) {
    const wasOffline = !isOnline;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-3">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${wasOffline ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
          {wasOffline ? '📵' : '✅'}
        </div>
        <p className="font-bold text-gray-900 dark:text-white text-lg">{wasOffline ? 'Queued offline' : 'Saved!'}</p>
        <p className="text-sm text-gray-400 text-center px-8">
          {wasOffline
            ? 'Will sync automatically when you reconnect.'
            : `₹${Number(amount).toLocaleString('en-IN')} · ${selectedCat?.name || 'General'}`}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
        >
          ✕ Cancel
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white text-lg">Quick Add</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col gap-5 px-6 pt-4">
        {/* Amount — big and prominent */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Amount</label>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-light text-gray-400">₹</span>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-44 text-5xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none text-center placeholder:text-gray-200 dark:placeholder:text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="w-32 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Category chips */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Category</label>
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.slice(0, 10).map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  categoryId === c.id
                    ? 'bg-primary-600 text-white shadow-sm scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm'
                }`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Payment type chips */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">Paid with</label>
          <div className="flex flex-wrap gap-2 justify-center">
            {paymentTypes.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => setPaymentTypeId(p.id === paymentTypeId ? '' : p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  paymentTypeId === p.id
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm'
                }`}
              >
                {p.icon && <span>{p.icon}</span>}
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button — fixed at bottom */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={handleSave}
          disabled={!canSave || createExpense.isPending}
          className="w-full py-4 rounded-2xl bg-primary-600 text-white text-lg font-bold shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          {createExpense.isPending ? 'Saving…' : `Save ₹${amount ? Number(amount).toLocaleString('en-IN') : '0'}`}
        </button>
        <button
          onClick={() => navigate('/expense/new')}
          className="w-full mt-3 text-sm text-gray-400 text-center"
        >
          Need more fields? Open full form →
        </button>
      </div>
    </div>
  );
}
