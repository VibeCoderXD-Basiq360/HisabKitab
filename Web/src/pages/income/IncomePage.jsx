import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import TopBar from '../../components/TopBar';
import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../../hooks/useIncome';
import { useAccounts } from '../../hooks/useAccounts';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const now = new Date();

const CATEGORIES = [
  { value: 'SALARY',     label: 'Salary',      icon: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',   icon: '💻' },
  { value: 'RENTAL',     label: 'Rental',      icon: '🏠' },
  { value: 'BUSINESS',   label: 'Business',    icon: '🪪' },
  { value: 'INVESTMENT', label: 'Investment',  icon: '📈' },
  { value: 'GIFT',       label: 'Gift',        icon: '🎁' },
  { value: 'REFUND',     label: 'Refund',      icon: '↩️' },
  { value: 'OTHER',      label: 'Other',       icon: '💰' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const EMPTY = { title: '', amount: '', category: 'SALARY', source: '', incomeDate: format(now, 'yyyy-MM-dd'), note: '', accountId: '' };

function IncomeForm({ initial, onSave, onClose, saving, accounts = [] }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.amount || !form.incomeDate) return;
    onSave(form);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 999, margin: '0 auto 4px' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
          {initial ? 'Edit Income' : 'Add Income'}
        </h2>

        {/* Amount */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0"
            style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '12px 16px', fontSize: 18, fontWeight: 700, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            required
            autoFocus
          />
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. June Salary"
            style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '10px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Category</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set('category', c.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: form.category === c.value ? '#00C2B2' : '#E9ECF0',
                  color: form.category === c.value ? '#FFFFFF' : '#374151',
                  transition: 'background 0.15s',
                }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source + Date row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Source (optional)</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              placeholder="e.g. Infosys"
              style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Date</label>
            <input
              type="date"
              value={form.incomeDate}
              onChange={(e) => set('incomeDate', e.target.value)}
              style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Any note…"
            style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '10px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {accounts.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>🏦 Add to Account <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <select
              value={form.accountId}
              onChange={(e) => set('accountId', e.target.value)}
              style={{ width: '100%', background: '#E9ECF0', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — ₹{Number(a.balance).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)',
            border: 'none',
            borderRadius: 16,
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 14,
            padding: '14px 0',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save Income'}
        </button>
      </form>
    </div>
  );
}

export default function IncomePage() {
  const [viewMonth, setViewMonth] = useState(now);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null); // income object being edited

  const isCurrentMonth = isSameMonth(viewMonth, now);

  const params = {
    fromDate: startOfMonth(viewMonth).toISOString(),
    toDate:   endOfMonth(viewMonth).toISOString(),
  };

  const { data: incomes = [], isLoading } = useIncome(params);
  const create = useCreateIncome();
  const update = useUpdateIncome();
  const del    = useDeleteIncome();
  const { data: accounts = [] } = useAccounts();

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);

  // Group by date
  const grouped = incomes.reduce((acc, i) => {
    const key = format(new Date(i.incomeDate), 'dd MMM yyyy');
    (acc[key] = acc[key] || []).push(i);
    return acc;
  }, {});

  function handleSave(form) {
    if (editing) {
      update.mutate({ id: editing.id, ...form, amount: Number(form.amount) }, { onSuccess: closeForm });
    } else {
      create.mutate({ ...form, amount: Number(form.amount) }, { onSuccess: closeForm });
    }
  }

  function openEdit(income) {
    setEditing(income);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this income entry?')) return;
    del.mutate(id);
  }

  const saving = create.isPending || update.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Income" showBack />

      {/* Month selector */}
      <div style={{ padding: '12px 16px', background: '#F0F2F7', flexShrink: 0 }}>
        <div style={{ background: '#E9ECF0', borderRadius: 12, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#374151', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>{format(viewMonth, 'MMMM yyyy')}</span>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            disabled={isCurrentMonth}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#374151', fontSize: 18, cursor: isCurrentMonth ? 'default' : 'pointer', opacity: isCurrentMonth ? 0.25 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >›</button>
        </div>
      </div>

      {/* Hero total */}
      <div style={{ margin: '0 16px 16px', background: 'linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)', borderRadius: 22, padding: 20, flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
          {format(viewMonth, 'MMMM yyyy')} · {incomes.length} entr{incomes.length !== 1 ? 'ies' : 'y'}
        </p>
        <p style={{ fontSize: 34, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, margin: '0 0 4px' }}>
          ₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Total income</p>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#B0B8C4', fontSize: 14 }}>Loading…</div>
        ) : incomes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12 }}>
            <span style={{ fontSize: 40, color: '#00C2B2' }}>💰</span>
            <p style={{ color: '#B0B8C4', fontSize: 14, textAlign: 'center', margin: 0 }}>No income recorded for {format(viewMonth, 'MMMM yyyy')}</p>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
            >
              + Log Income
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 16px' }}>
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} style={{ marginBottom: 12 }}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 6px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{date}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: 0 }}>
                    +₹{items.reduce((s, i) => s + Number(i.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>

                {/* Income items */}
                <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                  {items.map((income, idx) => {
                    const cat = CAT_MAP[income.category] || CAT_MAP.OTHER;
                    return (
                      <div
                        key={income.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 14px',
                          borderTop: idx > 0 ? '1px solid #E9ECF0' : 'none',
                        }}
                      >
                        {/* Emoji icon box */}
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {cat.icon}
                        </div>

                        {/* Title + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{income.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#00C2B2', fontWeight: 500 }}>{cat.label}</span>
                            {income.source && <span style={{ fontSize: 12, color: '#B0B8C4' }}>· {income.source}</span>}
                            {income.isRecurring && <Badge variant="recurring" label="Recurring" />}
                          </div>
                        </div>

                        {/* Amount */}
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#059669', flexShrink: 0, margin: 0 }}>
                          +₹{Number(income.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => openEdit(income)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', color: '#B0B8C4', cursor: 'pointer', fontSize: 14 }}
                          >✏️</button>
                          <button
                            onClick={() => handleDelete(income.id)}
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', color: '#B0B8C4', cursor: 'pointer', fontSize: 14 }}
                          >🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </SurfaceCard>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)',
          border: 'none',
          borderRadius: 999,
          color: '#FFFFFF',
          fontSize: 28,
          boxShadow: '0 4px 20px rgba(0,194,178,0.40)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
        }}
        aria-label="Add income"
      >
        +
      </button>

      {showForm && (
        <IncomeForm
          initial={editing ? {
            title:      editing.title,
            amount:     String(editing.amount),
            category:   editing.category,
            source:     editing.source || '',
            incomeDate: format(new Date(editing.incomeDate), 'yyyy-MM-dd'),
            note:       editing.note || '',
            accountId:  editing.accountId || '',
          } : null}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          accounts={accounts}
        />
      )}
    </div>
  );
}
