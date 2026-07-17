import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryItems, useCreateItem, useAddStock, useAdjustStock, useTransferStock, useBusiness } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const CATEGORIES = ['FILAMENT', 'PACKAGING', 'ELECTRONICS', 'HARDWARE', 'OTHER'];
const UNITS = ['GRAM', 'KG', 'PIECE', 'METER', 'ROLL'];
const CAT_ICONS = { FILAMENT: '🧵', PACKAGING: '📦', ELECTRONICS: '⚡', HARDWARE: '🔩', OTHER: '📋' };

const fmt = (qty, unit) =>
  unit === 'GRAM' ? `${Number(qty).toFixed(0)}g`
  : unit === 'KG' ? `${Number(qty).toFixed(2)}kg`
  : `${Number(qty).toFixed(0)} ${unit.toLowerCase()}`;

const inputCls = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1.5px solid #E9ECF0',
  background: '#F8F9FB',
  color: '#0A0D14',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.40)' }} onClick={onClose} />
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: 20,
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14', marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateItem();
  const addStock   = useAddStock();
  const adjust     = useAdjustStock();
  const transfer   = useTransferStock();

  const locations = business?.locations || [];
  const [sheet, setSheet]       = useState(null); // 'new-item' | 'add-stock' | 'adjust' | 'transfer'
  const [selItem, setSelItem]   = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch]     = useState('');

  const [itemForm, setItemForm] = useState({ name: '', sku: '', category: 'FILAMENT', unit: 'GRAM', costPrice: '', lowStockThreshold: '' });
  const [stockForm, setStockForm] = useState({ locationId: locations[0]?.id || '', quantity: '', unitCost: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [adjForm, setAdjForm]   = useState({ locationId: locations[0]?.id || '', quantity: '', type: 'ADJUSTMENT', note: '' });
  const [xferForm, setXferForm] = useState({ fromLocationId: locations[0]?.id || '', toLocationId: locations[1]?.id || '', quantity: '', note: '' });

  const [err, setErr] = useState('');

  const filteredItems = items
    .filter(i => !filterCat || i.category === filterCat)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  async function handleCreateItem(e) {
    e.preventDefault(); setErr('');
    try {
      await createItem.mutateAsync(itemForm);
      setSheet(null);
      setItemForm({ name: '', sku: '', category: 'FILAMENT', unit: 'GRAM', costPrice: '', lowStockThreshold: '' });
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleAddStock(e) {
    e.preventDefault(); setErr('');
    try {
      await addStock.mutateAsync({ itemId: selItem.id, ...stockForm });
      setSheet(null);
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleAdjust(e) {
    e.preventDefault(); setErr('');
    try {
      await adjust.mutateAsync({ itemId: selItem.id, ...adjForm });
      setSheet(null);
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleTransfer(e) {
    e.preventDefault(); setErr('');
    try {
      await transfer.mutateAsync({ itemId: selItem.id, ...xferForm });
      setSheet(null);
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  function openAction(item, action) { setSelItem(item); setErr(''); setSheet(action); }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Inventory" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '16px 16px 0' }}>

        {/* Search bar */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          border: '1.5px solid #E9ECF0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          marginBottom: 12,
          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
        }}>
          <span style={{ color: '#9CA3AF', marginRight: 8, fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#0A0D14', padding: '12px 0' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          )}
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
          {['', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterCat === c
                  ? 'linear-gradient(135deg, #00C2B2, #00D896)'
                  : '#E9ECF0',
                color: filterCat === c ? '#fff' : '#6B7280',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {c ? `${CAT_ICONS[c]} ${c}` : 'All'}
            </button>
          ))}
        </div>

        {isLoading && (
          <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading…</p>
        )}

        {/* Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredItems.map(item => {
            const totalQty = item.stocks.reduce((s, st) => s + Number(st.quantity), 0);
            const isLow  = item.lowStockThreshold && totalQty > 0 && totalQty <= Number(item.lowStockThreshold);
            const isOut  = totalQty === 0;
            const totalValue = totalQty * Number(item.costPrice);

            return (
              <SurfaceCard key={item.id} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 18 }}>{CAT_ICONS[item.category]}</span>
                      <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>{item.name}</p>
                      {isOut  && <Badge variant="danger"  label="Out of stock" />}
                      {!isOut && isLow && <Badge variant="warning" label="Low stock" />}
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                      {item.category} · <span style={{ color: '#00C2B2', fontWeight: 700 }}>
                        ₹{Number(item.costPrice).toFixed(item.unit === 'GRAM' ? 4 : 2)}/{item.unit.toLowerCase()}
                      </span>
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>
                      ₹{Math.round(totalValue).toLocaleString('en-IN')}
                    </p>
                    <p style={{ fontSize: 11, color: '#374151', marginTop: 1 }}>
                      {fmt(totalQty, item.unit)}
                    </p>
                  </div>
                </div>

                {/* Per-location stock pills */}
                {item.stocks.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {item.stocks.map(st => (
                      <span key={st.id} style={{
                        fontSize: 11,
                        background: '#F0F2F7',
                        color: '#6B7280',
                        borderRadius: 999,
                        padding: '3px 10px',
                      }}>
                        {st.location.name}: {fmt(st.quantity, item.unit)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[['+ Stock', 'add-stock'], ['Adjust', 'adjust'], ['Transfer', 'transfer']].map(([label, action]) => (
                    <button
                      key={action}
                      onClick={() => openAction(item, action)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1.5px solid #E9ECF0',
                        background: '#F8F9FB',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setErr(''); setSheet('new-item'); }}
        style={{
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'linear-gradient(135deg, #00C2B2, #00D896)',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '14px 22px',
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,194,178,0.35)',
          cursor: 'pointer',
          zIndex: 40,
        }}
      >
        + New Item
      </button>

      {/* New item sheet */}
      {sheet === 'new-item' && (
        <Sheet title="New Inventory Item" onClose={() => setSheet(null)}>
          <form onSubmit={handleCreateItem}>
            <FormField label="Name *">
              <input style={inputCls} required value={itemForm.name}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. PLA Black 1kg" />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Category">
                <select style={inputCls} value={itemForm.category}
                  onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Unit">
                <select style={inputCls} value={itemForm.unit}
                  onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Cost price (per unit)">
                <input style={inputCls} type="number" step="0.0001" required
                  value={itemForm.costPrice}
                  onChange={e => setItemForm(f => ({ ...f, costPrice: e.target.value }))} />
              </FormField>
              <FormField label="Low stock alert">
                <input style={inputCls} type="number"
                  value={itemForm.lowStockThreshold}
                  onChange={e => setItemForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
                  placeholder="optional" />
              </FormField>
            </div>
            {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={createItem.isPending}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: createItem.isPending ? 0.6 : 1 }}>
                {createItem.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Add stock sheet */}
      {sheet === 'add-stock' && selItem && (
        <Sheet title={`Add Stock — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleAddStock}>
            <FormField label="Location">
              <select style={inputCls} value={stockForm.locationId}
                onChange={e => setStockForm(f => ({ ...f, locationId: e.target.value }))}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label={`Quantity (${selItem.unit.toLowerCase()})`}>
                <input style={inputCls} type="number" required value={stockForm.quantity}
                  onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} />
              </FormField>
              <FormField label="Unit cost (optional)">
                <input style={inputCls} type="number" step="0.0001" value={stockForm.unitCost}
                  onChange={e => setStockForm(f => ({ ...f, unitCost: e.target.value }))}
                  placeholder={Number(selItem.costPrice).toFixed(4)} />
              </FormField>
            </div>
            <FormField label="Date">
              <input style={inputCls} type="date" value={stockForm.date}
                onChange={e => setStockForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Note (optional)">
              <input style={inputCls} value={stockForm.note}
                onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))} />
            </FormField>
            {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={addStock.isPending}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: addStock.isPending ? 0.6 : 1 }}>
                {addStock.isPending ? '…' : 'Add Stock'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Adjust sheet */}
      {sheet === 'adjust' && selItem && (
        <Sheet title={`Adjust — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleAdjust}>
            <FormField label="Location">
              <select style={inputCls} value={adjForm.locationId}
                onChange={e => setAdjForm(f => ({ ...f, locationId: e.target.value }))}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            <FormField label="Type">
              <select style={inputCls} value={adjForm.type}
                onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ADJUSTMENT">Adjustment (manual count fix)</option>
                <option value="WASTAGE">Wastage (lost/damaged)</option>
              </select>
            </FormField>
            <FormField label="Quantity change (negative to remove)">
              <input style={inputCls} type="number" required value={adjForm.quantity}
                onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="-50 or +100" />
            </FormField>
            <FormField label="Note">
              <input style={inputCls} value={adjForm.note}
                onChange={e => setAdjForm(f => ({ ...f, note: e.target.value }))} />
            </FormField>
            {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={adjust.isPending}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: adjust.isPending ? 0.6 : 1 }}>
                {adjust.isPending ? '…' : 'Save'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Transfer sheet */}
      {sheet === 'transfer' && selItem && (
        <Sheet title={`Transfer — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleTransfer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="From">
                <select style={inputCls} value={xferForm.fromLocationId}
                  onChange={e => setXferForm(f => ({ ...f, fromLocationId: e.target.value }))}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </FormField>
              <FormField label="To">
                <select style={inputCls} value={xferForm.toLocationId}
                  onChange={e => setXferForm(f => ({ ...f, toLocationId: e.target.value }))}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label={`Quantity (${selItem.unit.toLowerCase()})`}>
              <input style={inputCls} type="number" required value={xferForm.quantity}
                onChange={e => setXferForm(f => ({ ...f, quantity: e.target.value }))} />
            </FormField>
            <FormField label="Note (optional)">
              <input style={inputCls} value={xferForm.note}
                onChange={e => setXferForm(f => ({ ...f, note: e.target.value }))} />
            </FormField>
            {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 8 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={transfer.isPending}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: transfer.isPending ? 0.6 : 1 }}>
                {transfer.isPending ? '…' : 'Transfer'}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}
