import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useUpdateSettings, useAddLocation, useInvitePartner, useUpdatePartner } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  );
}

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

export default function BusinessSettingsPage() {
  const navigate = useNavigate();
  const { data: business, isLoading, refetch } = useBusiness();
  const updateSettings = useUpdateSettings();
  const addLocation = useAddLocation();
  const invitePartner = useInvitePartner();
  const updatePartner = useUpdatePartner();

  const settings = business?.settings;
  const [s, setS] = useState({
    printerCostRs: '', printerLifeHr: '', printerPowerW: '', electricityRateKwh: '',
    labourRateHr: '', labourOn: true, defaultFailureRatePct: '', defaultTargetMarginPct: '',
  });

  useEffect(() => {
    if (settings) {
      setS({
        printerCostRs: settings.printerCostRs || '',
        printerLifeHr: settings.printerLifeHr || '',
        printerPowerW: settings.printerPowerW || '',
        electricityRateKwh: settings.electricityRateKwh || '',
        labourRateHr: settings.labourRateHr || '',
        labourOn: settings.labourOn ?? true,
        defaultFailureRatePct: settings.defaultFailureRatePct || '',
        defaultTargetMarginPct: settings.defaultTargetMarginPct || '',
      });
    }
  }, [settings]);

  const [settingsMsg, setSettingsMsg] = useState('');
  const [sheet, setSheet] = useState(null);
  const [locName, setLocName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerShare, setPartnerShare] = useState('50');
  const [err, setErr] = useState('');

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm';

  async function saveSettings() {
    setSettingsMsg('');
    try {
      await updateSettings.mutateAsync(s);
      setSettingsMsg('Saved!');
      setTimeout(() => setSettingsMsg(''), 2000);
    } catch (ex) { setSettingsMsg('Error saving'); }
  }

  async function handleAddLocation(e) {
    e.preventDefault(); setErr('');
    try {
      await addLocation.mutateAsync({ name: locName });
      setSheet(null); setLocName(''); refetch();
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleInvitePartner(e) {
    e.preventDefault(); setErr('');
    try {
      await invitePartner.mutateAsync({ email: partnerEmail, profitSharePct: Number(partnerShare) });
      setSheet(null); setPartnerEmail(''); refetch();
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>;

  const partners = business?.partners || [];
  const locations = business?.locations || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Business Settings" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Default Calculator Settings */}
        <Section title="Default Calculator Settings">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Printer cost (₹)</label>
                <input className={inputCls} type="number" value={s.printerCostRs} onChange={e => setS(f => ({ ...f, printerCostRs: e.target.value }))} placeholder="25000" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Printer life (hr)</label>
                <input className={inputCls} type="number" value={s.printerLifeHr} onChange={e => setS(f => ({ ...f, printerLifeHr: e.target.value }))} placeholder="2000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Power (W)</label>
                <input className={inputCls} type="number" value={s.printerPowerW} onChange={e => setS(f => ({ ...f, printerPowerW: e.target.value }))} placeholder="200" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Electricity (₹/kWh)</label>
                <input className={inputCls} type="number" step="0.01" value={s.electricityRateKwh} onChange={e => setS(f => ({ ...f, electricityRateKwh: e.target.value }))} placeholder="8" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Labour rate (₹/hr)</label>
                <input className={inputCls} type="number" value={s.labourRateHr} onChange={e => setS(f => ({ ...f, labourRateHr: e.target.value }))} placeholder="100" /></div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer mb-1">
                  <div onClick={() => setS(f => ({ ...f, labourOn: !f.labourOn }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${s.labourOn ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.labourOn ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-xs text-gray-500">Labour on</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Default failure %</label>
                <input className={inputCls} type="number" value={s.defaultFailureRatePct} onChange={e => setS(f => ({ ...f, defaultFailureRatePct: e.target.value }))} placeholder="10" /></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Default margin %</label>
                <input className={inputCls} type="number" value={s.defaultTargetMarginPct} onChange={e => setS(f => ({ ...f, defaultTargetMarginPct: e.target.value }))} placeholder="30" /></div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={saveSettings} disabled={updateSettings.isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60">
              {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
            </button>
            {settingsMsg && <span className="text-sm text-green-600 font-semibold">{settingsMsg}</span>}
          </div>
        </Section>

        {/* Locations */}
        <Section title="Locations">
          <div className="space-y-2 mb-3">
            {locations.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <p className="text-sm text-gray-700 dark:text-gray-200">📍 {l.name}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setLocName(''); setErr(''); setSheet('location'); }}
            className="w-full py-2.5 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 font-semibold text-sm">
            + Add Location
          </button>
        </Section>

        {/* Partners */}
        <Section title="Partners">
          <div className="space-y-2 mb-3">
            {partners.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{p.user?.name || p.user?.email}</p>
                  <p className="text-xs text-gray-400">{p.role} · {p.profitSharePct}% profit share</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setPartnerEmail(''); setPartnerShare('50'); setErr(''); setSheet('partner'); }}
            className="w-full py-2.5 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 font-semibold text-sm">
            + Invite Partner
          </button>
        </Section>
      </div>

      {sheet === 'location' && (
        <Sheet title="Add Location" onClose={() => setSheet(null)}>
          <form onSubmit={handleAddLocation} className="space-y-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Location name *</label>
              <input className={inputCls} required value={locName} onChange={e => setLocName(e.target.value)} placeholder="e.g. Gurgaon" />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={addLocation.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {addLocation.isPending ? '…' : 'Add'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {sheet === 'partner' && (
        <Sheet title="Invite Partner" onClose={() => setSheet(null)}>
          <form onSubmit={handleInvitePartner} className="space-y-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Partner's HisabKitab email *</label>
              <input className={inputCls} type="email" required value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="partner@example.com" />
            </div>
            <div><label className="text-xs text-gray-400 mb-1 block">Profit share %</label>
              <input className={inputCls} type="number" min="0" max="100" required value={partnerShare} onChange={e => setPartnerShare(e.target.value)} />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <p className="text-xs text-gray-400">The user must already have a HisabKitab account. They will be added as a partner immediately.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={invitePartner.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {invitePartner.isPending ? '…' : 'Invite'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      <BottomNav />
    </div>
  );
}
