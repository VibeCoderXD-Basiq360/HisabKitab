import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessExpenses, useCreateExpense, useDeleteExpense, useBusiness } from '../../hooks/useBusiness';
import { useAccounts } from '../../hooks/useAccounts';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const CATEGORIES = ['Materials','Rent','Utilities','Labour','Marketing','Transport','Equipment','Software','Packaging','Other'];
const CAT_ICONS = { Materials:'🧵', Rent:'🏠', Utilities:'💡', Labour:'👷', Marketing:'📢', Transport:'🚚', Equipment:'⚙️', Software:'💻', Packaging:'📦', Other:'📋' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

const inputStyle = {
  width:'100%', padding:'11px 14px', background:'#F0F2F7', border:'none',
  borderRadius:10, fontSize:13, color:'#0A0D14', outline:'none', boxSizing:'border-box',
};

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position:'relative', background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 20px', maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        <h2 style={{ fontSize:17, fontWeight:800, color:'#0A0D14' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function BusinessExpensePage() {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: accounts = [] } = useAccounts();
  const locations = business?.locations || [];

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [activeCategory, setActiveCategory] = useState('All');

  const from = new Date(year, month - 1, 1).toISOString();
  const to   = new Date(year, month, 0, 23, 59, 59).toISOString();
  const { data: expenses = [], isLoading } = useBusinessExpenses({ from, to });

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({
    category: 'Materials', amount: '', date: new Date().toISOString().split('T')[0],
    vendor: '', note: '', locationId: '', accountId: '',
  });
  const [err, setErr] = useState('');
  const [delId, setDelId] = useState(null);

  function shift(delta) {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const usedCategories = ['All', ...Array.from(new Set(expenses.map(e => e.category)))];
  const filtered = activeCategory === 'All' ? expenses : expenses.filter(e => e.category === activeCategory);

  const grouped = filtered.reduce((acc, e) => {
    const key = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});

  async function handleCreate(e) {
    e.preventDefault(); setErr('');
    try {
      await createExpense.mutateAsync({
        ...form,
        amount: Number(form.amount),
        locationId: form.locationId || undefined,
        accountId:  form.accountId  || undefined,
      });
      setSheet(false);
      setForm({ category: 'Materials', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', note: '', locationId: '', accountId: '' });
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleDelete(id) {
    await deleteExpense.mutateAsync(id);
    setDelId(null);
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F0F2F7', paddingBottom:'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Business Expenses" onBack={() => navigate('/business')} />

      <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Hero — dark navy gradient */}
        <div style={{ background:'linear-gradient(135deg,#0D1B2A 0%,#1B2E45 60%,#0D2137 100%)', borderRadius:22, padding:'22px 20px', boxShadow:'0 6px 28px rgba(13,27,42,0.25)' }}>
          {/* Month picker */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={() => shift(-1)} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.7)', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{MONTHS[month - 1]} {year}</p>
            <button onClick={() => shift(1)} disabled={year === now.getFullYear() && month === now.getMonth() + 1} style={{ width:32, height:32, borderRadius:10, background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.7)', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:(year === now.getFullYear() && month === now.getMonth() + 1) ? 0.3 : 1 }}>›</button>
          </div>

          <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:4, textAlign:'center' }}>{expenses.length} expenses this month</p>
          <p style={{ fontSize:34, fontWeight:800, color:'#fff', textAlign:'center', lineHeight:1 }}>{fmt(totalSpend)}</p>
          <p style={{ fontSize:12, color:'rgba(255,194,178,0.6)', textAlign:'center', marginTop:4 }}>Total spent</p>
        </div>

        {/* Add button */}
        <button
          onClick={() => { setErr(''); setSheet(true); }}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#00C2B2,#009E91)', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 4px 18px rgba(0,194,178,0.3)' }}
        >
          + Add Expense
        </button>

        {/* Category filter chips */}
        {usedCategories.length > 1 && (
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {usedCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:12, fontWeight:700,
                  background: activeCategory === cat ? '#00C2B2' : '#fff',
                  color: activeCategory === cat ? '#fff' : '#374151',
                  boxShadow: activeCategory === cat ? '0 2px 10px rgba(0,194,178,0.3)' : '0 1px 6px rgba(0,0,0,0.06)',
                  flexShrink:0,
                }}
              >
                {cat === 'All' ? 'All' : `${CAT_ICONS[cat] || '📋'} ${cat}`}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p style={{ textAlign:'center', color:'#B0B8C4', padding:'40px 0' }}>Loading…</p>}
        {!isLoading && filtered.length === 0 && <p style={{ textAlign:'center', color:'#B0B8C4', padding:'40px 0' }}>No expenses this month</p>}

        {/* Expense rows grouped by date */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{date}</p>
              <SurfaceCard style={{ padding:0 }}>
                {items.map((exp, i) => (
                  <div
                    key={exp.id}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i < items.length - 1 ? '1px solid #F0F2F7' : 'none' }}
                  >
                    <div style={{ width:40, height:40, borderRadius:12, background:'#F5F3FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {CAT_ICONS[exp.category] || '📋'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#0A0D14', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.vendor || exp.category}</p>
                        <Badge variant="purple" label="Biz" style={{ fontSize:8 }} />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <p style={{ fontSize:11, color:'#B0B8C4' }}>{exp.category}</p>
                        {exp.location && <p style={{ fontSize:11, color:'#B0B8C4' }}>· {exp.location.name}</p>}
                        {exp.account && (
                          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'#F0F2F7', color:'#374151', fontWeight:600 }}>
                            {exp.account.icon || ''} {exp.account.name}
                          </span>
                        )}
                      </div>
                      {exp.note && <p style={{ fontSize:11, color:'#B0B8C4', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{exp.note}</p>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#E11D48' }}>{fmt(exp.amount)}</p>
                      <button onClick={() => setDelId(exp.id)} style={{ background:'none', border:'none', fontSize:11, color:'#B0B8C4', cursor:'pointer', marginTop:2 }}>Delete</button>
                    </div>
                  </div>
                ))}
              </SurfaceCard>
            </div>
          ))}
        </div>
      </div>

      {/* Add expense sheet */}
      {sheet && (
        <Sheet title="Add Business Expense" onClose={() => setSheet(false)}>
          <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Category</label>
                <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Amount *</label>
                <input style={inputStyle} type="number" required step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Debit Account</label>
              <select style={inputStyle} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                <option value="">-- No account (untracked) --</option>
                {accounts.filter(a => a.type !== 'CREDIT_CARD').map(a => (
                  <option key={a.id} value={a.id}>{a.icon || ''} {a.name} ({a.type}) – Bal: {fmt(a.balance)}</option>
                ))}
              </select>
              {form.accountId && <p style={{ fontSize:11, color:'#B0B8C4', marginTop:5 }}>This amount will be deducted from the selected account balance.</p>}
            </div>

            <div>
              <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Date *</label>
              <input style={inputStyle} type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div>
              <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Vendor / Description</label>
              <input style={inputStyle} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder="e.g. Amazon, Local supplier" />
            </div>

            {locations.length > 0 && (
              <div>
                <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Location</label>
                <select style={inputStyle} value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:5 }}>Note (optional)</label>
              <input style={inputStyle} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>

            {err && <p style={{ fontSize:13, color:'#E11D48' }}>{err}</p>}
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={() => setSheet(false)} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid #E5E7EB', background:'#fff', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button type="submit" disabled={createExpense.isPending} style={{ flex:1, padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#00C2B2,#009E91)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity: createExpense.isPending ? 0.6 : 1 }}>
                {createExpense.isPending ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Delete confirm */}
      {delId && (
        <Sheet title="Delete expense?" onClose={() => setDelId(null)}>
          <p style={{ fontSize:13, color:'#374151' }}>This will also remove the account balance impact.</p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setDelId(null)} style={{ flex:1, padding:'13px', borderRadius:12, border:'1px solid #E5E7EB', background:'#fff', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancel</button>
            <button onClick={() => handleDelete(delId)} disabled={deleteExpense.isPending}
              style={{ flex:1, padding:'13px', borderRadius:12, border:'none', background:'#E11D48', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity: deleteExpense.isPending ? 0.6 : 1 }}>
              {deleteExpense.isPending ? '…' : 'Delete'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
