import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useCustomerDetail } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const STATUS_COLORS = { QUOTED:'bg-gray-100 text-gray-500', IN_PROGRESS:'bg-blue-100 text-blue-600',
  PRINTED:'bg-purple-100 text-purple-600', DELIVERED:'bg-green-100 text-green-600', CANCELLED:'bg-red-100 text-red-400' };

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function CustomerDetail({ customerId, onClose }) {
  const { data, isLoading } = useCustomerDetail(customerId);
  const navigate = useNavigate();

  return (
    <Sheet title={data?.name || 'Customer'} onClose={onClose}>
      {isLoading && <p className="text-gray-400 text-sm py-4 text-center">Loading…</p>}
      {data && (
        <>
          <div className="space-y-1 text-sm">
            {data.phone && <p className="text-gray-600 dark:text-gray-300">📞 {data.phone}</p>}
            {data.email && <p className="text-gray-600 dark:text-gray-300">✉️ {data.email}</p>}
            {data.address && <p className="text-gray-600 dark:text-gray-300">📍 {data.address}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {[['Jobs', data.jobs?.length || 0], ['Revenue', fmt(data.jobs?.reduce((s,j) => s + Number(j.actualPrice || j.suggestedPrice || 0), 0) || 0)],
              ['Last job', data.jobs?.length ? new Date(data.jobs[0].orderDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—']
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{v}</p>
              </div>
            ))}
          </div>

          {data.jobs?.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-1">Job History</p>
              <div className="space-y-2">
                {data.jobs.map(j => (
                  <div key={j.id} onClick={() => { onClose(); navigate(`/business/jobs/${j.id}`); }}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{j.title}</p>
                      <p className="text-xs text-gray-400">{new Date(j.orderDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(j.actualPrice || j.suggestedPrice)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[j.status]}`}>{j.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {data.notes && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-300">{data.notes}</div>}
        </>
      )}
    </Sheet>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [sheet, setSheet] = useState(null); // 'new' | { id }
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', notes:'' });
  const [err, setErr] = useState('');

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm';

  const filtered = search
    ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    : customers;

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    try {
      if (sheet?.id) {
        await updateCustomer.mutateAsync({ id: sheet.id, ...form });
      } else {
        await createCustomer.mutateAsync(form);
      }
      setSheet(null);
      setForm({ name:'', phone:'', email:'', address:'', notes:'' });
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setErr('');
    setSheet({ id: c.id });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <TopBar title="Customers" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4">
        <button onClick={() => { setForm({ name:'', phone:'', email:'', address:'', notes:'' }); setErr(''); setSheet('new'); }}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow mb-3">
          + New Customer
        </button>

        <input className={`${inputCls} mb-3`} placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />

        {isLoading && <p className="text-center text-gray-400 py-10">Loading…</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center text-gray-400 py-10">No customers found</p>}

        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div onClick={() => setDetailId(c.id)} className="flex-1 min-w-0 cursor-pointer">
                  <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                </div>
                <button onClick={() => openEdit(c)}
                  className="ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit sheet */}
      {sheet !== null && (
        <Sheet title={sheet?.id ? 'Edit Customer' : 'New Customer'} onClose={() => setSheet(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[['Name *', 'name', 'text', true], ['Phone', 'phone', 'tel', false], ['Email', 'email', 'email', false], ['Address', 'address', 'text', false]].map(([label, key, type, req]) => (
              <div key={key}><label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <input className={inputCls} type={type} required={req} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div><label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {createCustomer.isPending || updateCustomer.isPending ? '…' : (sheet?.id ? 'Save' : 'Create')}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Detail sheet */}
      {detailId && <CustomerDetail customerId={detailId} onClose={() => setDetailId(null)} />}

      <BottomNav />
    </div>
  );
}
