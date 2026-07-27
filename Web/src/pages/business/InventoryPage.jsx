import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryItems, useCreateItem, useAddStock, useAdjustStock, useTransferStock, useBusiness } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const CATEGORIES = ['FILAMENT', 'PACKAGING', 'ELECTRONICS', 'HARDWARE', 'OTHER'];
const UNITS = ['GRAM', 'KG', 'PIECE', 'METER', 'ROLL'];
const CAT_ICONS = { FILAMENT: '🧵', PACKAGING: '📦', ELECTRONICS: '⚡', HARDWARE: '🔩', OTHER: '📋' };

const FILAMENT_BRANDS = ['Bambu Lab', 'eSUN', 'Polymaker', 'Creality', 'Hatchbox', 'Sunlu', 'Prusament', 'Overture', 'Generic'];
const FILAMENT_TYPES  = ['PLA', 'PLA+', 'PETG', 'TPU', 'ABS', 'ASA', 'Nylon', 'Silk', 'FLEX', 'PVA', 'HIPS', 'PC'];
const FILAMENT_COLORS = [
  { name: 'Black',       hex: '#1C1C1C' },
  { name: 'White',       hex: '#F5F5F5' },
  { name: 'Grey',        hex: '#808080' },
  { name: 'Red',         hex: '#E53935' },
  { name: 'Blue',        hex: '#1E88E5' },
  { name: 'Green',       hex: '#43A047' },
  { name: 'Yellow',      hex: '#FDD835' },
  { name: 'Orange',      hex: '#FB8C00' },
  { name: 'Purple',      hex: '#8E24AA' },
  { name: 'Pink',        hex: '#F06292' },
  { name: 'Brown',       hex: '#6D4C41' },
  { name: 'Natural',     hex: '#F5E6C8' },
  { name: 'Gold',        hex: '#D4A017' },
  { name: 'Silver',      hex: '#A8A9AD' },
  { name: 'Transparent', hex: '#DFF0FF' },
];
const SPOOL_SIZES = [250, 500, 1000, 2000];

const fmt = (qty, unit) =>
  unit === 'GRAM' ? `${Number(qty).toFixed(0)}g`
  : unit === 'KG'   ? `${Number(qty).toFixed(2)}kg`
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
      <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14', marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

const EMPTY_FIL = { brand: 'Bambu Lab', type: 'PLA', colorName: 'Black', colorHex: '#1C1C1C', spoolG: 1000, totalPrice: '', locationId: '', spoolCount: 1 };
const EMPTY_ITEM = { name: '', sku: '', category: 'PACKAGING', unit: 'PIECE', costPrice: '', lowStockThreshold: '' };

export default function InventoryPage() {
  const navigate   = useNavigate();
  const { data: business } = useBusiness();
  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateItem();
  const addStock   = useAddStock();
  const adjust     = useAdjustStock();
  const transfer   = useTransferStock();

  const locations = business?.locations || [];
  const [sheet, setSheet]       = useState(null);
  const [selItem, setSelItem]   = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch]     = useState('');
  const [newCat, setNewCat]     = useState('FILAMENT');

  const [filForm, setFilForm]   = useState({ ...EMPTY_FIL, locationId: locations[0]?.id || '' });
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM });
  const [stockForm, setStockForm] = useState({ locationId: '', quantity: '', unitCost: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [adjForm, setAdjForm]   = useState({ locationId: '', quantity: '', type: 'ADJUSTMENT', note: '' });
  const [xferForm, setXferForm] = useState({ fromLocationId: '', toLocationId: '', quantity: '', note: '' });
  const [err, setErr] = useState('');

  const filteredItems = items
    .filter(i => !filterCat || i.category === filterCat)
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  function openNewItem() {
    setErr('');
    setNewCat('FILAMENT');
    setFilForm({ ...EMPTY_FIL, locationId: locations[0]?.id || '' });
    setItemForm({ ...EMPTY_ITEM });
    setSheet('new-item');
  }

  async function handleCreateFilament(e) {
    e.preventDefault(); setErr('');
    if (!filForm.totalPrice) return setErr('Enter total price paid');
    const costPerG = Number(filForm.totalPrice) / Number(filForm.spoolG);
    const name = `${filForm.brand} ${filForm.type} ${filForm.colorName}`;
    try {
      const item = await createItem.mutateAsync({
        name,
        category: 'FILAMENT',
        unit: 'GRAM',
        costPrice: costPerG,
        lowStockThreshold: 200,
        brand: filForm.brand,
        filamentType: filForm.type,
        colorName: filForm.colorName,
        colorHex: filForm.colorHex,
      });
      if (filForm.locationId) {
        await addStock.mutateAsync({
          itemId: item.id,
          locationId: filForm.locationId,
          quantity: Number(filForm.spoolG) * Number(filForm.spoolCount),
          unitCost: costPerG,
        });
      }
      setSheet(null);
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleCreateItem(e) {
    e.preventDefault(); setErr('');
    try {
      await createItem.mutateAsync({ ...itemForm, category: newCat });
      setSheet(null);
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

  function openAction(item, action) {
    setSelItem(item);
    setErr('');
    const locId = locations[0]?.id || '';
    if (action === 'add-stock') setStockForm({ locationId: locId, quantity: '', unitCost: '', note: '', date: new Date().toISOString().split('T')[0] });
    if (action === 'adjust')    setAdjForm({ locationId: locId, quantity: '', type: 'ADJUSTMENT', note: '' });
    if (action === 'transfer')  setXferForm({ fromLocationId: locId, toLocationId: locations[1]?.id || locId, quantity: '', note: '' });
    setSheet(action);
  }

  const chipBtn = (active) => ({
    padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: 'none',
    cursor: 'pointer', transition: 'background 0.15s',
    background: active ? 'linear-gradient(135deg, #00C2B2, #00D896)' : '#E9ECF0',
    color: active ? '#fff' : '#6B7280',
  });

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Inventory" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E9ECF0', display: 'flex', alignItems: 'center', padding: '0 14px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <span style={{ color: '#9CA3AF', marginRight: 8, fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#0A0D14', padding: '12px 0' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
          {['', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={{ ...chipBtn(filterCat === c), flexShrink: 0 }}>
              {c ? `${CAT_ICONS[c]} ${c}` : 'All'}
            </button>
          ))}
        </div>

        {isLoading && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading…</p>}

        {/* Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredItems.map(item => {
            const totalQty   = item.stocks.reduce((s, st) => s + Number(st.quantity), 0);
            const isLow      = item.lowStockThreshold && totalQty > 0 && totalQty <= Number(item.lowStockThreshold);
            const isOut      = totalQty === 0;
            const totalValue = totalQty * Number(item.costPrice);

            return (
              <SurfaceCard key={item.id} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      {item.colorHex && item.category === 'FILAMENT'
                        ? <span style={{ width: 18, height: 18, borderRadius: '50%', background: item.colorHex, border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                        : <span style={{ fontSize: 18 }}>{CAT_ICONS[item.category]}</span>
                      }
                      <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>{item.name}</p>
                      {isOut  && <Badge variant="danger"  label="Out of stock" />}
                      {!isOut && isLow && <Badge variant="warning" label="Low stock" />}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.filamentType && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'rgba(0,194,178,0.1)', color: '#00A896' }}>
                          {item.filamentType}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {item.category} · <span style={{ color: '#00C2B2', fontWeight: 700 }}>
                          ₹{Number(item.costPrice).toFixed(item.unit === 'GRAM' ? 4 : 2)}/{item.unit.toLowerCase()}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>₹{Math.round(totalValue).toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: 11, color: '#374151', marginTop: 1 }}>{fmt(totalQty, item.unit)}</p>
                  </div>
                </div>

                {item.stocks.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {item.stocks.map(st => (
                      <span key={st.id} style={{ fontSize: 11, background: '#F0F2F7', color: '#6B7280', borderRadius: 999, padding: '3px 10px' }}>
                        {st.location.name}: {fmt(st.quantity, item.unit)}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {[['+ Stock', 'add-stock'], ['Adjust', 'adjust'], ['Transfer', 'transfer']].map(([label, action]) => (
                    <button key={action} onClick={() => openAction(item, action)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1.5px solid #E9ECF0', background: '#F8F9FB', color: '#374151', cursor: 'pointer' }}>
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
      <button onClick={openNewItem} style={{
        position: 'fixed', bottom: 'calc(88px + env(safe-area-inset-bottom))', right: 20,
        background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', border: 'none',
        borderRadius: 999, padding: '14px 22px', fontSize: 14, fontWeight: 700,
        boxShadow: '0 4px 16px rgba(0,194,178,0.35)', cursor: 'pointer', zIndex: 40,
      }}>
        + New Item
      </button>

      {/* ── New Item Sheet ── */}
      {sheet === 'new-item' && (
        <Sheet title="Add Inventory Item" onClose={() => setSheet(null)}>
          {/* Category picker */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setNewCat(c)} style={{ ...chipBtn(newCat === c), fontSize: 11, padding: '6px 12px' }}>
                {CAT_ICONS[c]} {c}
              </button>
            ))}
          </div>

          {newCat === 'FILAMENT' ? (
            <form onSubmit={handleCreateFilament}>
              {/* Brand */}
              <FormField label="Brand">
                <select style={inputCls} value={filForm.brand} onChange={e => setFilForm(f => ({ ...f, brand: e.target.value }))}>
                  {FILAMENT_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </FormField>

              {/* Type chips */}
              <FormField label="Filament type">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILAMENT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setFilForm(f => ({ ...f, type: t }))}
                      style={{
                        padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: filForm.type === t ? '2px solid #00C2B2' : '1.5px solid #E9ECF0',
                        background: filForm.type === t ? 'rgba(0,194,178,0.08)' : '#F8F9FB',
                        color: filForm.type === t ? '#00A896' : '#374151',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Color swatches */}
              <FormField label="Color">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  {FILAMENT_COLORS.map(c => (
                    <button key={c.name} type="button" title={c.name} onClick={() => setFilForm(f => ({ ...f, colorName: c.name, colorHex: c.hex }))}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                        background: c.hex, flexShrink: 0,
                        border: filForm.colorName === c.name ? '3px solid #00C2B2' : '2px solid rgba(0,0,0,0.10)',
                        boxShadow: filForm.colorName === c.name ? '0 0 0 2px rgba(0,194,178,0.25)' : 'none',
                      }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>Custom</label>
                  <input type="color" value={filForm.colorHex}
                    onChange={e => setFilForm(f => ({ ...f, colorHex: e.target.value, colorName: 'Custom' }))}
                    style={{ width: 36, height: 32, borderRadius: 8, border: '1.5px solid #E9ECF0', cursor: 'pointer', padding: 2, background: '#fff' }} />
                  <input style={{ ...inputCls, flex: 1 }} placeholder="Color name" value={filForm.colorName}
                    onChange={e => setFilForm(f => ({ ...f, colorName: e.target.value }))} />
                </div>
              </FormField>

              {/* Spool size chips */}
              <FormField label="Spool size">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {SPOOL_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => setFilForm(f => ({ ...f, spoolG: s }))}
                      style={{
                        padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        border: filForm.spoolG === s ? '2px solid #00C2B2' : '1.5px solid #E9ECF0',
                        background: filForm.spoolG === s ? 'rgba(0,194,178,0.08)' : '#F8F9FB',
                        color: filForm.spoolG === s ? '#00A896' : '#374151',
                      }}>
                      {s >= 1000 ? `${s / 1000}kg` : `${s}g`}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Location */}
              {locations.length > 0 && (
                <FormField label="📍 Location">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {locations.map(l => (
                      <button key={l.id} type="button" onClick={() => setFilForm(f => ({ ...f, locationId: l.id }))}
                        style={{
                          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          border: filForm.locationId === l.id ? '2px solid #00C2B2' : '1.5px solid #E9ECF0',
                          background: filForm.locationId === l.id ? 'rgba(0,194,178,0.08)' : '#F8F9FB',
                          color: filForm.locationId === l.id ? '#00A896' : '#374151',
                        }}>
                        {l.name}
                      </button>
                    ))}
                  </div>
                </FormField>
              )}

              {/* Spool count */}
              {filForm.locationId && (
                <FormField label="Number of spools">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #E9ECF0', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
                    <button type="button" onClick={() => setFilForm(f => ({ ...f, spoolCount: Math.max(1, f.spoolCount - 1) }))}
                      style={{ padding: '10px 18px', background: '#F8F9FB', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#374151' }}>−</button>
                    <span style={{ padding: '10px 20px', fontSize: 16, fontWeight: 800, color: '#0A0D14', minWidth: 40, textAlign: 'center' }}>{filForm.spoolCount}</span>
                    <button type="button" onClick={() => setFilForm(f => ({ ...f, spoolCount: f.spoolCount + 1 }))}
                      style={{ padding: '10px 18px', background: '#F8F9FB', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#374151' }}>+</button>
                  </div>
                  <p style={{ fontSize: 11, color: '#6B7280', margin: '5px 0 0' }}>
                    Will add {filForm.spoolCount * filForm.spoolG}g to {locations.find(l => l.id === filForm.locationId)?.name}
                  </p>
                </FormField>
              )}

              {/* Price */}
              <FormField label="Total price paid (₹) per spool">
                <input style={inputCls} type="number" step="0.01" required value={filForm.totalPrice}
                  onChange={e => setFilForm(f => ({ ...f, totalPrice: e.target.value }))} placeholder="e.g. 850" />
                {filForm.totalPrice && (
                  <p style={{ fontSize: 12, color: '#00A896', fontWeight: 700, margin: '6px 0 0' }}>
                    → ₹{(Number(filForm.totalPrice) / filForm.spoolG).toFixed(4)}/g
                  </p>
                )}
              </FormField>

              {/* Auto name preview */}
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,194,178,0.06)', border: '1px solid rgba(0,194,178,0.2)', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 3px', fontWeight: 600 }}>ITEM NAME</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: filForm.colorHex, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
                    {filForm.brand} {filForm.type} {filForm.colorName}
                  </p>
                </div>
              </div>

              {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 10 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setSheet(null)}
                  style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={createItem.isPending || addStock.isPending}
                  style={{ flex: 2, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: (createItem.isPending || addStock.isPending) ? 0.6 : 1 }}>
                  {(createItem.isPending || addStock.isPending) ? 'Adding…' : 'Add Filament'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateItem}>
              <FormField label="Name *">
                <input style={inputCls} required value={itemForm.name}
                  onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder={`e.g. ${CAT_ICONS[newCat]} ${newCat} item`} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Unit">
                  <select style={inputCls} value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </FormField>
                <FormField label="Cost per unit (₹)">
                  <input style={inputCls} type="number" step="0.0001" required value={itemForm.costPrice}
                    onChange={e => setItemForm(f => ({ ...f, costPrice: e.target.value }))} />
                </FormField>
              </div>
              <FormField label="Low stock alert">
                <input style={inputCls} type="number" value={itemForm.lowStockThreshold}
                  onChange={e => setItemForm(f => ({ ...f, lowStockThreshold: e.target.value }))} placeholder="optional" />
              </FormField>
              {err && <p style={{ fontSize: 13, color: '#E11D48', marginBottom: 8 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setSheet(null)}
                  style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1.5px solid #E9ECF0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={createItem.isPending}
                  onClick={() => setItemForm(f => ({ ...f, category: newCat }))}
                  style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #00C2B2, #00D896)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: createItem.isPending ? 0.6 : 1 }}>
                  {createItem.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </Sheet>
      )}

      {/* ── Add stock sheet ── */}
      {sheet === 'add-stock' && selItem && (
        <Sheet title={`Add Stock — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleAddStock}>
            <FormField label="Location">
              <select style={inputCls} value={stockForm.locationId}
                onChange={e => setStockForm(f => ({ ...f, locationId: e.target.value }))}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>

            {/* Spool size shortcuts for filament */}
            {selItem.category === 'FILAMENT' && (
              <FormField label="Quick spool size">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 4 }}>
                  {SPOOL_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => setStockForm(f => ({ ...f, quantity: String(s) }))}
                      style={{
                        padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: stockForm.quantity === String(s) ? '2px solid #00C2B2' : '1.5px solid #E9ECF0',
                        background: stockForm.quantity === String(s) ? 'rgba(0,194,178,0.08)' : '#F8F9FB',
                        color: stockForm.quantity === String(s) ? '#00A896' : '#374151',
                      }}>
                      {s >= 1000 ? `${s / 1000}kg` : `${s}g`}
                    </button>
                  ))}
                </div>
              </FormField>
            )}

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

      {/* ── Adjust sheet ── */}
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
                onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))} placeholder="-50 or +100" />
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

      {/* ── Transfer sheet ── */}
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
