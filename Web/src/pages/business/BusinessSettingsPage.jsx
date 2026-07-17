import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useUpdateSettings, useAddLocation, useInvitePartner, useUpdatePartner, usePartnerInvites } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Toggle from '../../components/ui/Toggle';
import MenuRow from '../../components/ui/MenuRow';

function Section({ title, children }) {
  return (
    <SurfaceCard style={{ padding: '16px 16px 12px' }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>{title}</p>
      {children}
    </SurfaceCard>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A0D14', margin: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: '#F0F2F7',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  fontWeight: 500,
  color: '#0A0D14',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#B0B8C4',
  display: 'block',
  marginBottom: 6,
};

export default function BusinessSettingsPage() {
  const navigate = useNavigate();
  const { data: business, isLoading, refetch } = useBusiness();
  const { data: sentInvites = [] } = usePartnerInvites();
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

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#B0B8C4', fontSize: 15 }}>Loading…</p>
    </div>
  );

  const partners = business?.partners || [];
  const locations = business?.locations || [];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Business Settings" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Calculator Settings */}
        <Section title="Default Calculator Settings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Printer cost (₹)</label>
                <input style={inputStyle} type="number" value={s.printerCostRs} onChange={e => setS(f => ({ ...f, printerCostRs: e.target.value }))} placeholder="25000" />
              </div>
              <div>
                <label style={labelStyle}>Printer life (hr)</label>
                <input style={inputStyle} type="number" value={s.printerLifeHr} onChange={e => setS(f => ({ ...f, printerLifeHr: e.target.value }))} placeholder="2000" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Power (W)</label>
                <input style={inputStyle} type="number" value={s.printerPowerW} onChange={e => setS(f => ({ ...f, printerPowerW: e.target.value }))} placeholder="200" />
              </div>
              <div>
                <label style={labelStyle}>Electricity (₹/kWh)</label>
                <input style={inputStyle} type="number" step="0.01" value={s.electricityRateKwh} onChange={e => setS(f => ({ ...f, electricityRateKwh: e.target.value }))} placeholder="8" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Labour rate (₹/hr)</label>
                <input style={inputStyle} type="number" value={s.labourRateHr} onChange={e => setS(f => ({ ...f, labourRateHr: e.target.value }))} placeholder="100" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <MenuRow
                  icon="⚙️"
                  iconBg="linear-gradient(135deg, #6B7280, #9CA3AF)"
                  label="Labour on"
                  noBorder
                  rightSlot={<Toggle value={s.labourOn} onChange={v => setS(f => ({ ...f, labourOn: v }))} />}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Default failure %</label>
                <input style={inputStyle} type="number" value={s.defaultFailureRatePct} onChange={e => setS(f => ({ ...f, defaultFailureRatePct: e.target.value }))} placeholder="10" />
              </div>
              <div>
                <label style={labelStyle}>Default margin %</label>
                <input style={inputStyle} type="number" value={s.defaultTargetMarginPct} onChange={e => setS(f => ({ ...f, defaultTargetMarginPct: e.target.value }))} placeholder="30" />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button onClick={saveSettings} disabled={updateSettings.isPending}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: updateSettings.isPending ? 'not-allowed' : 'pointer', opacity: updateSettings.isPending ? 0.6 : 1 }}>
              {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
            </button>
            {settingsMsg && <span style={{ fontSize: 13, fontWeight: 700, color: settingsMsg === 'Saved!' ? '#059669' : '#E11D48' }}>{settingsMsg}</span>}
          </div>
        </Section>

        {/* Locations */}
        <Section title="Locations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            {locations.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < locations.length - 1 ? '1px solid #F0F2F7' : 'none' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', margin: 0 }}>📍 {l.name}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setLocName(''); setErr(''); setSheet('location'); }}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid rgba(0,194,178,0.3)', background: 'rgba(0,194,178,0.04)', color: '#00C2B2', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Add Location
          </button>
        </Section>

        {/* Partners */}
        <Section title="Partners">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            {partners.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < partners.length + sentInvites.length - 1 ? '1px solid #F0F2F7' : 'none' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{p.user?.name || p.user?.email}</p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{p.role} · {p.profitSharePct}% profit share</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#F0FDF4', borderRadius: 20, padding: '3px 10px' }}>Active</span>
              </div>
            ))}
            {sentInvites.map((inv, i) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < sentInvites.length - 1 ? '1px solid #F0F2F7' : 'none', opacity: 0.7 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{inv.user?.name || inv.user?.email}</p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>PARTNER · {Number(inv.profitSharePct)}% profit share</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', background: '#FFFBEB', borderRadius: 20, padding: '3px 10px' }}>⏳ Pending</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setPartnerEmail(''); setPartnerShare('50'); setErr(''); setSheet('partner'); }}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid rgba(0,194,178,0.3)', background: 'rgba(0,194,178,0.04)', color: '#00C2B2', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Invite Partner
          </button>
        </Section>

      </div>

      {sheet === 'location' && (
        <Sheet title="Add Location" onClose={() => setSheet(null)}>
          <form onSubmit={handleAddLocation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Location name *</label>
              <input style={inputStyle} required value={locName} onChange={e => setLocName(e.target.value)} placeholder="e.g. Gurgaon" />
            </div>
            {err && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={addLocation.isPending}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: addLocation.isPending ? 'not-allowed' : 'pointer', opacity: addLocation.isPending ? 0.6 : 1 }}>
                {addLocation.isPending ? '…' : 'Add'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {sheet === 'partner' && (
        <Sheet title="Invite Partner" onClose={() => setSheet(null)}>
          <form onSubmit={handleInvitePartner} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Partner's HisabKitab email *</label>
              <input style={inputStyle} type="email" required value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} placeholder="partner@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Profit share %</label>
              <input style={inputStyle} type="number" min="0" max="100" required value={partnerShare} onChange={e => setPartnerShare(e.target.value)} />
            </div>
            {err && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{err}</p>}
            <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>The user must already have a HisabKitab account. They will be added as a partner immediately.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={invitePartner.isPending}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: invitePartner.isPending ? 'not-allowed' : 'pointer', opacity: invitePartner.isPending ? 0.6 : 1 }}>
                {invitePartner.isPending ? '…' : 'Invite'}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}
