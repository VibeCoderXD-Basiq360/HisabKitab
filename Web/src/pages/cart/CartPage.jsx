import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import { useCartStore } from '../../store/cartStore';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreateExpense } from '../../hooks/useExpenses';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function CheckoutSheet({ onClose }) {
  const navigate = useNavigate();
  const { name, categoryId, paymentTypeId: storePaymentTypeId, accountId: storeAccountId, items, getTotal, clearCart, setField } = useCartStore();
  const { data: categories = [] } = useCategories();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const { data: accounts = [] } = useAccounts();
  const createExpense = useCreateExpense();

  const [title, setTitle] = useState(name || '');
  const [catId, setCatId] = useState(categoryId || '');
  const [ptId, setPtId] = useState(storePaymentTypeId || '');
  const [accId, setAccId] = useState(storeAccountId || '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const total = getTotal();

  async function handleCheckout() {
    if (!ptId) return;
    await createExpense.mutateAsync({
      title: title || 'Shopping',
      amount: total,
      expenseDate: date,
      categoryId: catId || undefined,
      paymentTypeId: ptId,
      accountId: accId || undefined,
      items: items.map((it, i) => ({ name: it.name, amount: it.amount, order: i })),
    });
    clearCart();
    onClose();
    navigate('/home');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4 pb-8 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto" />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Checkout</h2>
          <div className="bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{fmt(total)}</span>
            <span className="text-xs text-primary-400 ml-1">· {items.length} items</span>
          </div>
        </div>

        {/* Expense title */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Expense Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sabzi Mandi, Grocery Run"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Category <span className="font-normal text-gray-400">(optional)</span></label>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Payment type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Payment Method *</label>
          <select
            value={ptId}
            onChange={(e) => setPtId(e.target.value)}
            required
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">Select…</option>
            {paymentTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Account */}
        {accounts.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">🏦 Deduct from Account <span className="font-normal text-gray-400">(optional)</span></label>
            <select
              value={accId}
              onChange={(e) => setAccId(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">No account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {createExpense.error && (
          <p className="text-xs text-red-500">Failed to save expense. Please try again.</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={!ptId || createExpense.isPending}
          className="w-full h-12 rounded-xl bg-primary-500 text-white font-bold text-sm disabled:opacity-40"
        >
          {createExpense.isPending ? 'Saving…' : `Save as Expense · ${fmt(total)}`}
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const {
    name, items, getTotal, setField, addItem, removeItem, updateItem, clearCart,
  } = useCartStore();

  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const total = getTotal();

  function handleAdd(e) {
    e?.preventDefault();
    if (!itemName.trim() || !itemAmount || Number(itemAmount) <= 0) return;
    addItem(itemName, itemAmount);
    setItemName('');
    setItemAmount('');
    nameRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (itemName.trim() && itemAmount && Number(itemAmount) > 0) {
        handleAdd();
      } else if (itemName.trim() && !itemAmount) {
        // Move focus to amount
        document.getElementById('cart-item-amount')?.focus();
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar
        title="🛒 Cart"
        showBack
        action={
          items.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Clear all items?')) clearCart(); }}
              className="text-xs text-red-400 font-semibold px-3 py-1 rounded-lg"
            >
              Clear
            </button>
          )
        }
      />

      {/* Cart name */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <input
          value={name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Cart name (e.g. Sabzi Mandi, DMart run)"
          className="w-full text-base font-semibold text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600"
        />
      </div>

      {/* Running total strip */}
      <div className="bg-primary-500 px-4 py-3 flex items-center justify-between">
        <span className="text-white/80 text-sm font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        <span className="text-white text-xl font-bold">{fmt(total)}</span>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto pb-40">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <span className="text-5xl">🛒</span>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Your cart is empty</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs">Add items using the bar below</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-gray-300 dark:text-gray-600 text-xs font-mono w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="flex-1 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 outline-none"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        className="w-20 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 outline-none text-right"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between" onClick={() => setEditingId(item.id)}>
                      <p className="text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0 ml-2">{fmt(item.amount)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-400 text-sm shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick-add bar (fixed bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-2 z-20">
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Item name (e.g. Tomatoes)"
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-400"
          />
          <input
            id="cart-item-amount"
            type="number"
            inputMode="decimal"
            value={itemAmount}
            onChange={(e) => setItemAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="₹"
            className="w-20 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400 text-center"
          />
          <button
            onClick={handleAdd}
            disabled={!itemName.trim() || !itemAmount || Number(itemAmount) <= 0}
            className="bg-primary-500 text-white text-sm font-bold px-4 rounded-xl disabled:opacity-40 shrink-0"
          >
            Add
          </button>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm"
          >
            Checkout · {fmt(total)}
          </button>
        )}
      </div>

      {showCheckout && (
        <CheckoutSheet onClose={() => setShowCheckout(false)} />
      )}
    </div>
  );
}
