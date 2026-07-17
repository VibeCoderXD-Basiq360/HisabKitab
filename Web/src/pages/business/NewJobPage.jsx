import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useInventoryItems, useCustomers, useCreateCustomer, useCreateJob } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';

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

const inputStyle = {
  width:'100%', padding:'11px 14px', background:'#F0F2F7', border:'none',
  borderRadius:10, fontSize:13, color:'#0A0D14', outline:'none', boxSizing:'border-box',
};
const labelStyle = { fontSize:11, fontWeight:600, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 };
const sectionHeaderStyle = { fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 };

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

  return (
    <div style={{ minHeight:'100vh', background:'#F0F2F7', paddingBottom:'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="New Job" onBack={() => navigate('/business/jobs')} />

      <form onSubmit={handleSubmit} style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Basic info */}
        <SurfaceCard>
          <p style={sectionHeaderStyle}>Job Info</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} required value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Custom phone stand" />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <select style={inputStyle} value={form.locationId} onChange={e => setF('locationId', e.target.value)}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Customer</label>
              {newCustMode ? (
                <div style={{ display:'flex', gap:8 }}>
                  <input style={{ ...inputStyle, flex:1 }} placeholder="Customer name" value={newCustName} onChange={e => setNewCustName(e.target.value)} />
                  <button type="button" onClick={() => setNewCustMode(false)} style={{ background:'none', border:'none', fontSize:12, color:'#B0B8C4', cursor:'pointer', padding:'0 8px' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <select style={{ ...inputStyle, flex:1 }} value={form.customerId} onChange={e => setF('customerId', e.target.value)}>
                    <option value="">— No customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setNewCustMode(true)} style={{ background:'none', border:'none', fontSize:12, color:'#00C2B2', fontWeight:700, cursor:'pointer', padding:'0 8px', whiteSpace:'nowrap' }}>+ New</button>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Order date</label>
              <input style={inputStyle} type="date" value={form.orderDate} onChange={e => setF('orderDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea style={{ ...inputStyle, resize:'vertical', minHeight:60 }} rows={2} value={form.note} onChange={e => setF('note', e.target.value)} />
            </div>
          </div>
        </SurfaceCard>

        {/* Material + print */}
        <SurfaceCard>
          <p style={sectionHeaderStyle}>Material &amp; Print</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={labelStyle}>Filament</label>
              <select style={inputStyle} value={form.filamentItemId} onChange={e => onFilamentChange(e.target.value)}>
                <option value="">— manual entry —</option>
                {filamentItems.map(i => <option key={i.id} value={i.id}>{i.name} · ₹{(i.unit === 'KG' ? n(i.costPrice) : n(i.costPrice) * 1000).toFixed(0)}/kg</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={labelStyle}>₹/kg filament</label>
                <input style={inputStyle} type="number" value={form.filamentCostPerKg} onChange={e => setF('filamentCostPerKg', e.target.value)} placeholder="1000" />
              </div>
              <div>
                <label style={labelStyle}>Grams used</label>
                <input style={inputStyle} type="number" value={form.gramsUsed} onChange={e => setF('gramsUsed', e.target.value)} placeholder="50" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Print time</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <input style={inputStyle} type="number" min="0" value={form.printTimeHr} onChange={e => setF('printTimeHr', e.target.value)} />
                  <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#B0B8C4' }}>hr</span>
                </div>
                <div style={{ flex:1, position:'relative' }}>
                  <input style={inputStyle} type="number" min="0" max="59" value={form.printTimeMin} onChange={e => setF('printTimeMin', e.target.value)} />
                  <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'#B0B8C4' }}>min</span>
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Delivery / courier (₹)</label>
              <input style={inputStyle} type="number" value={form.deliveryCost} onChange={e => setF('deliveryCost', e.target.value)} />
            </div>
          </div>
        </SurfaceCard>

        {/* Add-ons & packaging */}
        <SurfaceCard>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <p style={sectionHeaderStyle}>Add-ons &amp; Packaging</p>
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={() => addJobItem('PACKAGING')} style={{ background:'none', border:'none', fontSize:12, color:'#00C2B2', fontWeight:700, cursor:'pointer' }}>+ Packaging</button>
              <button type="button" onClick={() => addJobItem('ADDON')} style={{ background:'none', border:'none', fontSize:12, color:'#00C2B2', fontWeight:700, cursor:'pointer' }}>+ Add-on</button>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {jobItems.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  <select style={inputStyle} value={item.itemId} onChange={e => onItemSelect(i, e.target.value)}>
                    <option value="">Custom item…</option>
                    {items.filter(x => x.category !== 'FILAMENT' && x.isActive).map(x =>
                      <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  {!item.itemId && <input style={inputStyle} placeholder="Item name" value={item.name} onChange={e => updateJobItem(i, { name: e.target.value })} />}
                  <div style={{ display:'flex', gap:6 }}>
                    <input style={{ ...inputStyle, flex:1 }} type="number" placeholder="Qty" value={item.quantity} onChange={e => updateJobItem(i, { quantity: e.target.value })} />
                    <input style={{ ...inputStyle, flex:1 }} type="number" placeholder="Unit cost ₹" value={item.unitCost} onChange={e => updateJobItem(i, { unitCost: e.target.value })} />
                  </div>
                  <p style={{ fontSize:11, color:'#B0B8C4' }}>{item.type} · ₹{(n(item.quantity) * n(item.unitCost)).toFixed(0)}</p>
                </div>
                <button type="button" onClick={() => removeJobItem(i)} style={{ background:'none', border:'none', color:'#E11D48', fontSize:18, cursor:'pointer', marginTop:2, padding:0 }}>✕</button>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Machine & power */}
        <SurfaceCard>
          <p style={sectionHeaderStyle}>Machine &amp; Power</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['Printer cost (₹)', 'printerCostRs'], ['Printer life (hr)', 'printerLifeHr'],
              ['Power (W)', 'printerPowerW'], ['Electricity ₹/kWh', 'electricityRateKwh']].map(([label, key]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} type="number" value={form[key]} onChange={e => setF(key, e.target.value)} />
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Labour */}
        <SurfaceCard>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <p style={sectionHeaderStyle}>Labour</p>
            <button
              type="button"
              onClick={() => setF('labourOn', !form.labourOn)}
              style={{
                padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer',
                background: form.labourOn ? '#E6FAF8' : '#F3F4F6',
                color: form.labourOn ? '#00C2B2' : '#9CA3AF',
                fontSize:12, fontWeight:700,
              }}
            >
              {form.labourOn ? 'On' : 'Off'}
            </button>
          </div>
          {form.labourOn && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={labelStyle}>Rate ₹/hr</label>
                <input style={inputStyle} type="number" value={form.labourRateHr} onChange={e => setF('labourRateHr', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Hands-on (min)</label>
                <input style={inputStyle} type="number" value={form.labourHandsOnMin} onChange={e => setF('labourHandsOnMin', e.target.value)} />
              </div>
            </div>
          )}
        </SurfaceCard>

        {/* Rates */}
        <SurfaceCard>
          <p style={sectionHeaderStyle}>Rates</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            <div>
              <label style={labelStyle}>Failure %</label>
              <input style={inputStyle} type="number" min="0" max="50" value={form.failureRatePct} onChange={e => setF('failureRatePct', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Margin %</label>
              <input style={inputStyle} type="number" min="0" max="90" value={form.targetMarginPct} onChange={e => setF('targetMarginPct', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Payment fee %</label>
              <input style={inputStyle} type="number" min="0" value={form.paymentFeePct} onChange={e => setF('paymentFeePct', e.target.value)} />
            </div>
          </div>
        </SurfaceCard>

        {/* Live cost sheet */}
        <div style={{ background:'linear-gradient(135deg,#0D1B2A 0%,#1B2E45 100%)', borderRadius:22, padding:'20px', boxShadow:'0 6px 28px rgba(13,27,42,0.25)' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Cost Sheet</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, fontFamily:'monospace', fontSize:13 }}>
            {[
              ['Material', costs.material], ['Electricity', costs.electricity],
              ['Depreciation', costs.depreciation], ['Labour', costs.labour],
              ['Packaging', costs.packagingCost], ['Failure markup', costs.failureMarkup],
              ['Add-ons', costs.addOnsCost], ['Delivery', n(form.deliveryCost)],
            ].map(([label, val]) => val > 0.01 && (
              <div key={label} style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.45)' }}>{label}</span>
                <span style={{ color:'rgba(255,255,255,0.8)' }}>{inr(val)}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.12)', paddingTop:10, marginTop:4, display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'rgba(255,255,255,0.6)' }}>True cost</span>
              <span style={{ color:'#fff', fontWeight:700 }}>{inr(costs.trueCost)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#00C2B2' }}>Suggested price</span>
              <span style={{ color:'#00C2B2', fontWeight:800, fontSize:18 }}>{inr(costs.suggestedPrice)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>Profit @ {Math.round(costs.marginPct)}% margin</span>
              <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{inr(costs.profit)}</span>
            </div>
          </div>

          {/* Actual price */}
          <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid rgba(255,255,255,0.12)' }}>
            <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:10 }}>
              What did you charge?
            </label>
            <input
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontWeight:700, fontSize:18, outline:'none', boxSizing:'border-box' }}
              type="number"
              placeholder={`Suggested: ₹${Math.round(costs.suggestedPrice)}`}
              value={form.actualPrice}
              onChange={e => setF('actualPrice', e.target.value)}
            />
            {actualP > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Actual profit</p>
                  <p style={{ fontSize:13, fontWeight:700, color: actualProfit >= 0 ? '#059669' : '#E11D48' }}>{inr(actualProfit)}</p>
                </div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Actual margin</p>
                  <p style={{ fontSize:13, fontWeight:700, color: actualMargin >= 20 ? '#059669' : actualMargin >= 0 ? '#F59E0B' : '#E11D48' }}>{Math.round(actualMargin)}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {err && <p style={{ fontSize:13, color:'#E11D48', textAlign:'center' }}>{err}</p>}

        <button
          type="submit"
          disabled={createJob.isPending || !form.title.trim()}
          style={{
            width:'100%', padding:'16px', borderRadius:12, border:'none', cursor: (createJob.isPending || !form.title.trim()) ? 'not-allowed' : 'pointer',
            background: (createJob.isPending || !form.title.trim()) ? '#E5E7EB' : 'linear-gradient(135deg,#00C2B2,#009E91)',
            color: (createJob.isPending || !form.title.trim()) ? '#9CA3AF' : '#fff',
            fontWeight:800, fontSize:15, boxShadow:'0 4px 18px rgba(0,194,178,0.3)',
          }}
        >
          {createJob.isPending ? 'Creating…' : '🖨️ Create Job'}
        </button>
      </form>
    </div>
  );
}
