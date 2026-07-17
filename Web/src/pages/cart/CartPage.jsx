import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
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

  const inputStyle = {
    width: '100%',
    background: '#F0F2F7',
    border: 'none',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    color: '#0A0D14',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#B0B8C4',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag pill */}
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 99, margin: '0 auto' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Checkout</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="active" label={`${items.length} items`} />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#00C2B2' }}>{fmt(total)}</span>
          </div>
        </div>

        {/* Expense title */}
        <div>
          <label style={labelStyle}>Expense Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sabzi Mandi, Grocery Run"
            style={inputStyle}
          />
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            style={inputStyle}
          >
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Payment type */}
        <div>
          <label style={labelStyle}>Payment Method *</label>
          <select
            value={ptId}
            onChange={(e) => setPtId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">Select…</option>
            {paymentTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Account */}
        {accounts.length > 0 && (
          <div>
            <label style={labelStyle}>🏦 Deduct from Account <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <select
              value={accId}
              onChange={(e) => setAccId(e.target.value)}
              style={inputStyle}
            >
              <option value="">No account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {createExpense.error && (
          <p style={{ fontSize: 12, color: '#E11D48', margin: 0 }}>Failed to save expense. Please try again.</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={!ptId || createExpense.isPending}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: !ptId || createExpense.isPending ? 'not-allowed' : 'pointer',
            opacity: !ptId || createExpense.isPending ? 0.4 : 1,
          }}
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
        document.getElementById('cart-item-amount')?.focus();
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title="🛒 Cart"
        showBack
        action={
          items.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Clear all items?')) clearCart(); }}
              style={{ fontSize: 12, color: '#E11D48', fontWeight: 600, padding: '4px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8 }}
            >
              Clear
            </button>
          )
        }
      />

      {/* Cart name input */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F0F2F7', padding: '12px 16px' }}>
        <input
          value={name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="Cart name (e.g. Sabzi Mandi, DMart run)"
          style={{
            width: '100%',
            fontSize: 15,
            fontWeight: 700,
            color: '#0A0D14',
            background: 'transparent',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* Running total strip */}
      <div style={{
        background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{fmt(total)}</span>
      </div>

      {/* Items list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 24px', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 52 }}>🛒</span>
            <p style={{ color: '#B0B8C4', fontSize: 14, margin: 0 }}>Your cart is empty</p>
            <p style={{ color: '#B0B8C4', fontSize: 12, margin: 0 }}>Add items using the bar below</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
            {items.map((item, i) => (
              <div
                key={item.id}
                style={{ borderRadius: 14, padding: '12px 14px', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span style={{ color: '#B0B8C4', fontSize: 11, fontFamily: 'monospace', width: 18, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === item.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        autoFocus
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        style={{ flex: 1, fontSize: 13, color: '#0A0D14', background: '#F0F2F7', borderRadius: 8, padding: '4px 8px', border: 'none', outline: 'none' }}
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) })}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        style={{ width: 72, fontSize: 13, color: '#0A0D14', background: '#F0F2F7', borderRadius: 8, padding: '4px 8px', border: 'none', outline: 'none', textAlign: 'right' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      onClick={() => setEditingId(item.id)}
                    >
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14', margin: 0, flexShrink: 0, marginLeft: 8 }}>{fmt(item.amount)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E9ECF0', borderRadius: 8, border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 12, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick-add bar (fixed bottom) */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid #E9ECF0',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={nameRef}
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Item name (e.g. Tomatoes)"
            style={{
              flex: 1,
              background: '#F0F2F7',
              border: 'none',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 13,
              color: '#0A0D14',
              outline: 'none',
            }}
          />
          <input
            id="cart-item-amount"
            type="number"
            inputMode="decimal"
            value={itemAmount}
            onChange={(e) => setItemAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="₹"
            style={{
              width: 72,
              background: '#F0F2F7',
              border: 'none',
              borderRadius: 10,
              padding: '11px 10px',
              fontSize: 13,
              color: '#0A0D14',
              outline: 'none',
              textAlign: 'center',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!itemName.trim() || !itemAmount || Number(itemAmount) <= 0}
            style={{
              background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              cursor: !itemName.trim() || !itemAmount || Number(itemAmount) <= 0 ? 'not-allowed' : 'pointer',
              opacity: !itemName.trim() || !itemAmount || Number(itemAmount) <= 0 ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setShowCheckout(true)}
            style={{
              width: '100%',
              height: 44,
              background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
            }}
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
