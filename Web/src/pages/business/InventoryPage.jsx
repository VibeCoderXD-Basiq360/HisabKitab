import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryItems, useCreateItem, useAddStock, useAdjustStock, useTransferStock, useBusiness } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const CATEGORIES = ['FILAMENT','PACKAGING','ELECTRONICS','HARDWARE','OTHER'];
const UNITS = ['GRAM','KG','PIECE','METER','ROLL'];
const CAT_ICONS = { FILAMENT:'🧵', PACKAGING:'📦', ELECTRONICS:'⚡', HARDWARE:'🔩', OTHER:'📋' };

const fmt = (qty, unit) => unit === 'GRAM' ? `${Number(qty).toFixed(0)}g` : unit === 'KG' ? `${Number(qty).toFixed(2)}kg` : `${Number(qty).toFixed(0)} ${unit.toLowerCase()}`;

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

export default function InventoryPage() {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateItem();
  const addStock   = useAddStock();
  const adjust     = useAdjustStock();
  const transfer   = useTransferStock();

  const locations = business?.locations || [];
  const [sheet, setSheet] = useState(null); // 'new-item' | 'add-stock' | 'adjust' | 'transfer'
  const [selItem, setSelItem] = useState(null);
  const [filterCat, setFilterCat] = useState('');

  const [itemForm, setItemForm] = useState({ name:'', sku:'', category:'FILAMENT', unit:'GRAM', costPrice:'', lowStockThreshold:'' });
  const [stockForm, setStockForm] = useState({ locationId: locations[0]?.id || '', quantity:'', unitCost:'', note:'', date: new Date().toISOString().split('T')[0] });
  const [adjForm, setAdjForm] = useState({ locationId: locations[0]?.id || '', quantity:'', type:'ADJUSTMENT', note:'' });
  const [xferForm, setXferForm] = useState({ fromLocationId: locations[0]?.id || '', toLocationId: locations[1]?.id || '', quantity:'', note:'' });

  const [err, setErr] = useState('');

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm';

  const filteredItems = filterCat ? items.filter(i => i.category === filterCat) : items;

  async function handleCreateItem(e) {
    e.preventDefault(); setErr('');
    try {
      await createItem.mutateAsync(itemForm);
      setSheet(null);
      setItemForm({ name:'', sku:'', category:'FILAMENT', unit:'GRAM', costPrice:'', lowStockThreshold:'' });
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Inventory" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
          {['', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filterCat === c ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
              {c ? `${CAT_ICONS[c]} ${c}` : 'All'}
            </button>
          ))}
        </div>

        <button onClick={() => { setErr(''); setSheet('new-item'); }}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow mb-3">
          + New Item
        </button>

        {isLoading && <p className="text-center text-gray-400 py-10">Loading…</p>}

        <div className="space-y-2">
          {filteredItems.map(item => {
            const totalQty = item.stocks.reduce((s, st) => s + Number(st.quantity), 0);
            const isLow = item.lowStockThreshold && totalQty <= Number(item.lowStockThreshold);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{CAT_ICONS[item.category]}</span>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Low stock</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.category} · ₹{Number(item.costPrice).toFixed(item.unit === 'GRAM' ? 4 : 2)}/{item.unit.toLowerCase()}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="font-bold text-gray-900 dark:text-white">{fmt(totalQty, item.unit)}</p>
                    <p className="text-xs text-gray-400">total</p>
                  </div>
                </div>

                {/* Per-location stock */}
                {item.stocks.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {item.stocks.map(st => (
                      <span key={st.id} className="text-xs bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                        {st.location.name}: {fmt(st.quantity, item.unit)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {[['+ Stock', 'add-stock'], ['Adjust', 'adjust'], ['Transfer', 'transfer']].map(([label, action]) => (
                    <button key={action} onClick={() => openAction(item, action)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New item sheet */}
      {sheet === 'new-item' && (
        <Sheet title="New Inventory Item" onClose={() => setSheet(null)}>
          <form onSubmit={handleCreateItem} className="space-y-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Name *</label>
              <input className={inputCls} required value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PLA Black 1kg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select className={inputCls} value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Unit</label>
                <select className={inputCls} value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Cost price (per unit)</label>
                <input className={inputCls} type="number" step="0.0001" required value={itemForm.costPrice} onChange={e => setItemForm(f => ({ ...f, costPrice: e.target.value }))} />
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Low stock alert</label>
                <input className={inputCls} type="number" value={itemForm.lowStockThreshold} onChange={e => setItemForm(f => ({ ...f, lowStockThreshold: e.target.value }))} placeholder="optional" />
              </div>
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={createItem.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {createItem.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Add stock sheet */}
      {sheet === 'add-stock' && selItem && (
        <Sheet title={`Add Stock — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleAddStock} className="space-y-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Location</label>
              <select className={inputCls} value={stockForm.locationId} onChange={e => setStockForm(f => ({ ...f, locationId: e.target.value }))}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Quantity ({selItem.unit.toLowerCase()})</label>
                <input className={inputCls} type="number" required value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Unit cost (optional)</label>
                <input className={inputCls} type="number" step="0.0001" value={stockForm.unitCost} onChange={e => setStockForm(f => ({ ...f, unitCost: e.target.value }))} placeholder={Number(selItem.costPrice).toFixed(4)} />
              </div>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Date</label>
              <input className={inputCls} type="date" value={stockForm.date} onChange={e => setStockForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Note (optional)</label>
              <input className={inputCls} value={stockForm.note} onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={addStock.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {addStock.isPending ? '…' : 'Add Stock'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Adjust sheet */}
      {sheet === 'adjust' && selItem && (
        <Sheet title={`Adjust — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleAdjust} className="space-y-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Location</label>
              <select className={inputCls} value={adjForm.locationId} onChange={e => setAdjForm(f => ({ ...f, locationId: e.target.value }))}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select className={inputCls} value={adjForm.type} onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ADJUSTMENT">Adjustment (manual count fix)</option>
                <option value="WASTAGE">Wastage (lost/damaged)</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Quantity change (negative to remove)</label>
              <input className={inputCls} type="number" required value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))} placeholder="-50 or +100" />
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Note</label>
              <input className={inputCls} value={adjForm.note} onChange={e => setAdjForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={adjust.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {adjust.isPending ? '…' : 'Save'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Transfer sheet */}
      {sheet === 'transfer' && selItem && (
        <Sheet title={`Transfer — ${selItem.name}`} onClose={() => setSheet(null)}>
          <form onSubmit={handleTransfer} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">From</label>
                <select className={inputCls} value={xferForm.fromLocationId} onChange={e => setXferForm(f => ({ ...f, fromLocationId: e.target.value }))}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">To</label>
                <select className={inputCls} value={xferForm.toLocationId} onChange={e => setXferForm(f => ({ ...f, toLocationId: e.target.value }))}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Quantity ({selItem.unit.toLowerCase()})</label>
              <input className={inputCls} type="number" required value={xferForm.quantity} onChange={e => setXferForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Note (optional)</label>
              <input className={inputCls} value={xferForm.note} onChange={e => setXferForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={transfer.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {transfer.isPending ? '…' : 'Transfer'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      <BottomNav />
    </div>
  );
}
