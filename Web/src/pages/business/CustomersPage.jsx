import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useCustomerDetail } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const STATUS_COLORS = {
  QUOTED:      { background: '#F3F4F6', color: '#6B7280' },
  IN_PROGRESS: { background: '#DBEAFE', color: '#2563EB' },
  PRINTED:     { background: '#EDE9FE', color: '#7C3AED' },
  DELIVERED:   { background: '#D1FAE5', color: '#059669' },
  CANCELLED:   { background: '#FEE2E2', color: '#EF4444' },
};

const inputCls = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 14,
  border: '1.5px solid #E9ECF0',
  background: '#fff',
  color: '#0A0D14',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: 20,
        maxHeight: '85vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A0D14', margin: 0 }}>{title}</h2>
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
      {isLoading && <p style={{ color: '#B0B8C4', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Loading…</p>}
      {data && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.phone   && <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>📞 {data.phone}</p>}
            {data.email   && <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>✉️ {data.email}</p>}
            {data.address && <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>📍 {data.address}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, paddingTop: 8 }}>
            {[
              ['Jobs', data.jobs?.length || 0],
              ['Revenue', fmt(data.jobs?.reduce((s, j) => s + Number(j.actualPrice || j.suggestedPrice || 0), 0) || 0)],
              ['Last job', data.jobs?.length
                ? new Date(data.jobs[0].orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : '—'],
            ].map(([l, v]) => (
              <SurfaceCard key={l} style={{ padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: '0 0 2px' }}>{l}</p>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0A0D14', margin: 0 }}>{v}</p>
              </SurfaceCard>
            ))}
          </div>

          {data.jobs?.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Job History</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.jobs.map(j => {
                  const sc = STATUS_COLORS[j.status] || STATUS_COLORS.QUOTED;
                  return (
                    <div key={j.id}
                      onClick={() => { onClose(); navigate(`/business/jobs/${j.id}`); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 0', borderBottom: '1px solid #F0F2F7', cursor: 'pointer',
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                        <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>
                          {new Date(j.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ marginLeft: 12, textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: '0 0 3px' }}>{fmt(j.actualPrice || j.suggestedPrice)}</p>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: sc.background, color: sc.color,
                        }}>{j.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {data.notes && (
            <SurfaceCard style={{ padding: 12 }}>
              <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>{data.notes}</p>
            </SurfaceCard>
          )}
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
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [err, setErr] = useState('');

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
      setForm({ name: '', phone: '', email: '', address: '', notes: '' });
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setErr('');
    setSheet({ id: c.id });
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Customers" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search bar */}
        <input
          style={{ ...inputCls, marginBottom: 12 }}
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {isLoading && <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>No customers found</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const totalSpent = c.jobs?.reduce((s, j) => s + Number(j.actualPrice || j.suggestedPrice || 0), 0) || 0;
            const outstanding = c.jobs?.reduce((s, j) => s + Number(j.outstandingBalance || 0), 0) || 0;
            const jobCount = c.jobs?.length || 0;
            const initial = (c.name || '?')[0].toUpperCase();

            return (
              <SurfaceCard key={c.id} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{initial}</span>
                  </div>

                  {/* Info */}
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setDetailId(c.id)}
                  >
                    <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 15, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </p>
                    {c.phone && <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>{c.phone}</p>}
                    {c.email && !c.phone && <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>{c.email}</p>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      {totalSpent > 0 && (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                          {fmt(totalSpent)} spent
                        </span>
                      )}
                      {outstanding > 0 && (
                        <span style={{ fontSize: 12, color: '#E11D48', fontWeight: 700 }}>
                          {fmt(outstanding)} due
                        </span>
                      )}
                      {jobCount > 0 && (
                        <span style={{ fontSize: 12, color: '#B0B8C4' }}>
                          {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => openEdit(c)}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 12,
                      fontSize: 12, fontWeight: 600,
                      background: '#F0F2F7', color: '#4B5563',
                      border: '1px solid #E9ECF0', cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </div>

      {/* FAB — New Customer */}
      <button
        onClick={() => { setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setErr(''); setSheet('new'); }}
        style={{
          position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom))', right: 20,
          background: 'linear-gradient(135deg,#00C2B2,#009E90)',
          color: '#fff', fontWeight: 700, fontSize: 24,
          width: 56, height: 56, borderRadius: 999,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(0,194,178,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 40,
        }}
      >
        +
      </button>

      {/* Create / Edit sheet */}
      {sheet !== null && (
        <Sheet title={sheet?.id ? 'Edit Customer' : 'New Customer'} onClose={() => setSheet(null)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Name *', 'name', 'text', true], ['Phone', 'phone', 'tel', false], ['Email', 'email', 'email', false], ['Address', 'address', 'text', false]].map(([label, key, type, req]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  style={inputCls}
                  type={type}
                  required={req}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Notes</label>
              <textarea
                style={{ ...inputCls, resize: 'none' }}
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            {err && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setSheet(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  border: '1.5px solid #E9ECF0', background: '#fff',
                  color: '#4B5563', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCustomer.isPending || updateCustomer.isPending}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  border: 'none', cursor: 'pointer', opacity: (createCustomer.isPending || updateCustomer.isPending) ? 0.6 : 1,
                }}
              >
                {createCustomer.isPending || updateCustomer.isPending ? '…' : (sheet?.id ? 'Save' : 'Create')}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Detail sheet */}
      {detailId && <CustomerDetail customerId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
