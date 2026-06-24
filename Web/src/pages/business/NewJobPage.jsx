import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useInventoryItems, useCustomers, useCreateCustomer, useCreateJob } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';

const n = v => Number(v) || 0;

function computeCosts({ gramsUsed, filamentCostPerKg, printTimeHr, printerCostRs, printerLifeHr,
  printerPowerW, electricityRateKwh, labourOn, labourRateHr, labourHandsOnMin,
  paymentFeePct, failureRatePct, targetMarginPct, deliveryCost, jobItems = [] }) {
  const material      = (n(gramsUsed) / 1000) * n(filamentCostPerKg);
  const electricity   = (n(printerPowerW) / 1000) * n(printTimeHr) * n(electricityRateKwh);
  const depreciation  = n(printerLifeHr) > 0 ? (n(printerCostRs) / n(printerLifeHr)) * n(printTimeHr) : 0;
  const labour        = labourOn ? n(labourRateHr) * (n(labourHandsOnMin) / 60) : 0;
  const packagingCost = jobItems.filter(i => i.type === 'PACKAGING').reduce((s, i) => s + n(i.quantity) * n(i.unitCost), 0);
  const addOnsCost    = jobItems.filter(i => i.type !== 'PACKAGING').reduce((s, i) => s + n(i.quantity) * n(i.unitCost), 0);
  const prodBase      = material + electricity + depreciation + labour + packagingCost;
  const fr            = n(failureRatePct);
  const failFactor    = fr < 100 ? 1 / (1 - fr / 100) : 1;
  const prodCost      = prodBase * failFactor;
  const failureMarkup = prodCost - prodBase;
  const tm            = n(targetMarginPct);
  const itemPrice     = tm < 100 ? prodCost / (1 - tm / 100) : prodCost;
  const suggestedPrice = itemPrice + n(deliveryCost) + addOnsCost;
  const trueCost      = prodCost + addOnsCost + n(deliveryCost);
  const paymentFee    = suggestedPrice * n(paymentFeePct) / 100;
  const profit        = suggestedPrice - trueCost - paymentFee;
  const marginPct     = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;
  return { material, electricity, depreciation, labour, packagingCost, addOnsCost, failureMarkup, prodBase, trueCost, suggestedPrice, profit, marginPct };
}

const inr = v => `₹${Math.round(Math.abs(n(v))).toLocaleString('en-IN')}`;

export default function NewJobPage() {
  const navigate  = useNavigate();
  const { data: business } = useBusiness();
  const { data: items = [] } = useInventoryItems();
  const { data: customers = [] } = useCustomers();
  const createJob = useCreateJob();
  const createCustomer = useCreateCustomer();

  const s = business?.settings || {};
  const locations = business?.locations || [];

  const [form, setForm] = useState({
    title: '', description: '', locationId: locations[0]?.id || '', customerId: '',
    filamentItemId: '', gramsUsed: '', filamentCostPerKg: '',
    printTimeHr: 4, printTimeMin: 0,
    printerCostRs: n(s.printerCostRs) || 80000,
    printerLifeHr: n(s.printerLifeHr) || 6000,
    printerPowerW: n(s.printerPowerW) || 160,
    electricityRateKwh: n(s.electricityRateKwh) || 10,
    labourOn: s.labourOnByDefault ?? true,
    labourRateHr: n(s.defaultLabourRateHr) || 150,
    labourHandsOnMin: 20,
    paymentFeePct: n(s.defaultPaymentFeePct) || 0,
    failureRatePct: n(s.defaultFailureRatePct) || 10,
    targetMarginPct: n(s.defaultTargetMarginPct) || 50,
    deliveryCost: 0,
    actualPrice: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '', note: '',
  });
  const [jobItems, setJobItems] = useState([]);
  const [newCustMode, setNewCustMode] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [err, setErr] = useState('');

  const filamentItems = items.filter(i => i.category === 'FILAMENT' && i.isActive);

  const costs = useMemo(() => computeCosts({
    gramsUsed: form.gramsUsed, filamentCostPerKg: form.filamentCostPerKg,
    printTimeHr: n(form.printTimeHr) + n(form.printTimeMin) / 60,
    printerCostRs: form.printerCostRs, printerLifeHr: form.printerLifeHr,
    printerPowerW: form.printerPowerW, electricityRateKwh: form.electricityRateKwh,
    labourOn: form.labourOn, labourRateHr: form.labourRateHr, labourHandsOnMin: form.labourHandsOnMin,
    paymentFeePct: form.paymentFeePct, failureRatePct: form.failureRatePct,
    targetMarginPct: form.targetMarginPct, deliveryCost: form.deliveryCost, jobItems,
  }), [form, jobItems]);

  const actualP = n(form.actualPrice);
  const actualProfit = actualP > 0 ? actualP - costs.trueCost - (actualP * n(form.paymentFeePct) / 100) : null;
  const actualMargin = actualP > 0 ? (actualProfit / actualP) * 100 : null;

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function onFilamentChange(itemId) {
    const item = items.find(i => i.id === itemId);
    const perKg = item ? (item.unit === 'KG' ? n(item.costPrice) : n(item.costPrice) * 1000) : '';
    setF('filamentItemId', itemId);
    setF('filamentCostPerKg', perKg);
  }

  function addJobItem(type) {
    setJobItems(prev => [...prev, { itemId: '', name: '', quantity: 1, unitCost: 0, type }]);
  }
  function updateJobItem(i, patch) { setJobItems(prev => prev.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  function removeJobItem(i) { setJobItems(prev => prev.filter((_, j) => j !== i)); }

  function onItemSelect(i, itemId) {
    const item = items.find(x => x.id === itemId);
    updateJobItem(i, { itemId, name: item?.name || '', unitCost: n(item?.costPrice) });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      let customerId = form.customerId;
      if (newCustMode && newCustName.trim()) {
        const c = await createCustomer.mutateAsync({ name: newCustName.trim() });
        customerId = c.id;
      }
      await createJob.mutateAsync({
        title: form.title, description: form.description,
        locationId: form.locationId, customerId: customerId || undefined,
        filamentItemId: form.filamentItemId || undefined,
        gramsUsed: n(form.gramsUsed) || undefined,
        filamentCostPerKg: n(form.filamentCostPerKg) || undefined,
        printTimeHr: n(form.printTimeHr) + n(form.printTimeMin) / 60,
        printerCostRs: form.printerCostRs, printerLifeHr: form.printerLifeHr,
        printerPowerW: form.printerPowerW, electricityRateKwh: form.electricityRateKwh,
        labourOn: form.labourOn, labourRateHr: form.labourRateHr, labourHandsOnMin: form.labourHandsOnMin,
        paymentFeePct: form.paymentFeePct, failureRatePct: form.failureRatePct,
        targetMarginPct: form.targetMarginPct, deliveryCost: form.deliveryCost,
        actualPrice: form.actualPrice !== '' ? n(form.actualPrice) : undefined,
        orderDate: form.orderDate, deliveryDate: form.deliveryDate || undefined,
        note: form.note || undefined, items: jobItems,
      });
      navigate('/business/jobs');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Something went wrong');
    }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm';
  const labelCls = 'text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1 block';
  const sectionCls = 'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-3';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
      <TopBar title="New Job" onBack={() => navigate('/business/jobs')} />

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-4">

        {/* Basic info */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Job Info</p>
          <div><label className={labelCls}>Title *</label>
            <input className={inputCls} required value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Custom phone stand" />
          </div>
          <div><label className={labelCls}>Location</label>
            <select className={inputCls} value={form.locationId} onChange={e => setF('locationId', e.target.value)}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Customer</label>
            {newCustMode ? (
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} placeholder="Customer name" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
                <button type="button" onClick={() => setNewCustMode(false)} className="text-xs text-gray-400 px-2">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select className={`${inputCls} flex-1`} value={form.customerId} onChange={e => setF('customerId', e.target.value)}>
                  <option value="">— No customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setNewCustMode(true)} className="text-xs text-primary-600 dark:text-primary-400 font-semibold px-2 shrink-0">+ New</button>
              </div>
            )}
          </div>
          <div><label className={labelCls}>Order date</label>
            <input className={inputCls} type="date" value={form.orderDate} onChange={e => setF('orderDate', e.target.value)} />
          </div>
          <div><label className={labelCls}>Notes (optional)</label>
            <textarea className={inputCls} rows={2} value={form.note} onChange={e => setF('note', e.target.value)} />
          </div>
        </div>

        {/* Material + print */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Material &amp; Print</p>
          <div>
            <label className={labelCls}>Filament</label>
            <select className={inputCls} value={form.filamentItemId} onChange={e => onFilamentChange(e.target.value)}>
              <option value="">— manual entry —</option>
              {filamentItems.map(i => <option key={i.id} value={i.id}>{i.name} · ₹{(i.unit === 'KG' ? n(i.costPrice) : n(i.costPrice) * 1000).toFixed(0)}/kg</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>₹/kg filament</label>
              <input className={inputCls} type="number" value={form.filamentCostPerKg} onChange={e => setF('filamentCostPerKg', e.target.value)} placeholder="1000" />
            </div>
            <div><label className={labelCls}>Grams used</label>
              <input className={inputCls} type="number" value={form.gramsUsed} onChange={e => setF('gramsUsed', e.target.value)} placeholder="50" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Print time</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input className={inputCls} type="number" min="0" value={form.printTimeHr} onChange={e => setF('printTimeHr', e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hr</span>
              </div>
              <div className="flex-1 relative">
                <input className={inputCls} type="number" min="0" max="59" value={form.printTimeMin} onChange={e => setF('printTimeMin', e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
              </div>
            </div>
          </div>
          <div><label className={labelCls}>Delivery / courier (₹)</label>
            <input className={inputCls} type="number" value={form.deliveryCost} onChange={e => setF('deliveryCost', e.target.value)} />
          </div>
        </div>

        {/* Add-ons & packaging */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Add-ons &amp; Packaging</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => addJobItem('PACKAGING')} className="text-xs text-primary-600 dark:text-primary-400 font-semibold">+ Packaging</button>
              <button type="button" onClick={() => addJobItem('ADDON')} className="text-xs text-primary-600 dark:text-primary-400 font-semibold">+ Add-on</button>
            </div>
          </div>
          {jobItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <select className={inputCls} value={item.itemId} onChange={e => onItemSelect(i, e.target.value)}>
                  <option value="">Custom item…</option>
                  {items.filter(x => x.category !== 'FILAMENT' && x.isActive).map(x =>
                    <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                {!item.itemId && <input className={inputCls} placeholder="Item name" value={item.name} onChange={e => updateJobItem(i, { name: e.target.value })} />}
                <div className="flex gap-2">
                  <input className={inputCls} type="number" placeholder="Qty" value={item.quantity}
                    onChange={e => updateJobItem(i, { quantity: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Unit cost ₹" value={item.unitCost}
                    onChange={e => updateJobItem(i, { unitCost: e.target.value })} />
                </div>
                <p className="text-xs text-gray-400">{item.type} · ₹{(n(item.quantity) * n(item.unitCost)).toFixed(0)}</p>
              </div>
              <button type="button" onClick={() => removeJobItem(i)} className="text-red-400 text-lg mt-1">✕</button>
            </div>
          ))}
        </div>

        {/* Machine & power */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Machine &amp; Power</p>
          <div className="grid grid-cols-2 gap-3">
            {[['Printer cost (₹)', 'printerCostRs'], ['Printer life (hr)', 'printerLifeHr'],
              ['Power (W)', 'printerPowerW'], ['Electricity ₹/kWh', 'electricityRateKwh']].map(([label, key]) => (
              <div key={key}><label className={labelCls}>{label}</label>
                <input className={inputCls} type="number" value={form[key]} onChange={e => setF(key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* Labour */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Labour</p>
            <button type="button" onClick={() => setF('labourOn', !form.labourOn)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${form.labourOn ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
              {form.labourOn ? 'On' : 'Off'}
            </button>
          </div>
          {form.labourOn && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Rate ₹/hr</label>
                <input className={inputCls} type="number" value={form.labourRateHr} onChange={e => setF('labourRateHr', e.target.value)} />
              </div>
              <div><label className={labelCls}>Hands-on (min)</label>
                <input className={inputCls} type="number" value={form.labourHandsOnMin} onChange={e => setF('labourHandsOnMin', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Rates */}
        <div className={sectionCls}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rates</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Failure %</label>
              <input className={inputCls} type="number" min="0" max="50" value={form.failureRatePct} onChange={e => setF('failureRatePct', e.target.value)} />
            </div>
            <div><label className={labelCls}>Margin %</label>
              <input className={inputCls} type="number" min="0" max="90" value={form.targetMarginPct} onChange={e => setF('targetMarginPct', e.target.value)} />
            </div>
            <div><label className={labelCls}>Payment fee %</label>
              <input className={inputCls} type="number" min="0" value={form.paymentFeePct} onChange={e => setF('paymentFeePct', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Live cost sheet */}
        <div className="bg-gray-900 dark:bg-gray-950 rounded-2xl p-4 shadow-sm text-white">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cost Sheet</p>
          <div className="space-y-1.5 font-mono text-sm">
            {[
              ['Material', costs.material], ['Electricity', costs.electricity],
              ['Depreciation', costs.depreciation], ['Labour', costs.labour],
              ['Packaging', costs.packagingCost], ['Failure markup', costs.failureMarkup],
              ['Add-ons', costs.addOnsCost], ['Delivery', n(form.deliveryCost)],
            ].map(([label, val]) => val > 0.01 && (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400">{label}</span>
                <span>{inr(val)}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="text-gray-300">True cost</span><span className="font-bold">{inr(costs.trueCost)}</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>Suggested price</span><span className="font-bold text-lg">{inr(costs.suggestedPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Profit @ {Math.round(costs.marginPct)}% margin</span><span>{inr(costs.profit)}</span>
            </div>
          </div>

          {/* Actual price */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">What did you charge?</label>
            <input className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-600 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-green-400"
              type="number" placeholder={`Suggested: ₹${Math.round(costs.suggestedPrice)}`}
              value={form.actualPrice} onChange={e => setF('actualPrice', e.target.value)} />
            {actualP > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-xl p-2 text-center">
                  <p className="text-xs text-gray-400">Actual profit</p>
                  <p className={`font-bold text-sm ${actualProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{inr(actualProfit)}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-2 text-center">
                  <p className="text-xs text-gray-400">Actual margin</p>
                  <p className={`font-bold text-sm ${actualMargin >= 20 ? 'text-green-400' : actualMargin >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{Math.round(actualMargin)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {err && <p className="text-sm text-red-500 text-center">{err}</p>}

        <button type="submit" disabled={createJob.isPending || !form.title.trim()}
          className="w-full py-4 rounded-xl bg-primary-600 text-white font-bold text-base disabled:opacity-60 shadow-lg">
          {createJob.isPending ? 'Creating…' : '🖨️ Create Job'}
        </button>
      </form>
    </div>
  );
}
