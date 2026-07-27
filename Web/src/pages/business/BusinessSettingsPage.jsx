import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useAddLocation, useInvitePartner, useUpdatePartner, usePartnerInvites, useUpdateSettings, useCreatePrinterProfile, useUpdatePrinterProfile, useDeletePrinterProfile } from '../../hooks/useBusiness';
import { usePeople } from '../../hooks/usePeople';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Toggle from '../../components/ui/Toggle';

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
  const { data: people = [] } = usePeople();
  const addLocation = useAddLocation();
  const invitePartner = useInvitePartner();
  const updatePartner = useUpdatePartner();
  const updateSettings = useUpdateSettings();
  const createProfile = useCreatePrinterProfile();
  const updateProfile = useUpdatePrinterProfile();
  const deleteProfile = useDeletePrinterProfile();

  const settings = business?.settings;
  const [s, setS] = useState({ labourRateHr: '', labourOn: true, failurePct: '', marginPct: '' });
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    if (!settings) return;
    setS({
      labourRateHr: settings.defaultLabourRateHr ?? '',
      labourOn: settings.labourOnByDefault ?? true,
      failurePct: settings.defaultFailureRatePct ?? '',
      marginPct: settings.defaultTargetMarginPct ?? '',
    });
  }, [settings]);

  async function saveSettings() {
    try {
      await updateSettings.mutateAsync({
        defaultLabourRateHr: Number(s.labourRateHr) || 0,
        labourOnByDefault: s.labourOn,
        defaultFailureRatePct: Number(s.failurePct) || 0,
        defaultTargetMarginPct: Number(s.marginPct) || 0,
      });
      setSettingsMsg('Saved!');
      setTimeout(() => setSettingsMsg(''), 2000);
    } catch { setSettingsMsg('Error saving'); }
  }

  const [sheet, setSheet] = useState(null);
  const [locName, setLocName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerShare, setPartnerShare] = useState('50');
  const [err, setErr] = useState('');

  const emptyProfile = { name: '', printerCostRs: '', printerLifeHr: '', printerPowerW: '', electricityRateKwh: '' };
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [editProfileId, setEditProfileId] = useState(null);

  function openCreateProfile() {
    setEditProfileId(null); setProfileForm(emptyProfile); setErr(''); setSheet('profile');
  }
  function openEditProfile(p) {
    setEditProfileId(p.id);
    setProfileForm({ name: p.name, printerCostRs: p.printerCostRs, printerLifeHr: p.printerLifeHr, printerPowerW: p.printerPowerW, electricityRateKwh: p.electricityRateKwh });
    setErr(''); setSheet('profile');
  }
  async function handleSaveProfile(e) {
    e.preventDefault(); setErr('');
    try {
      if (editProfileId) {
        await updateProfile.mutateAsync({ id: editProfileId, ...profileForm });
      } else {
        await createProfile.mutateAsync(profileForm);
      }
      setSheet(null);
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
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
  const printerProfiles = business?.printerProfiles || [];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Business Settings" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

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

        {/* Printer Profiles */}
        <Section title="Printer Profiles">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            {printerProfiles.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < printerProfiles.length - 1 ? '1px solid #F0F2F7' : 'none' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>🖨️ {p.name}</p>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>
                    ₹{Number(p.printerCostRs).toLocaleString('en-IN')} · {Number(p.printerLifeHr)}hr · {Number(p.printerPowerW)}W · ₹{Number(p.electricityRateKwh)}/kWh
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditProfile(p)} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#B0B8C4', fontSize: 13, fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteProfile.mutate(p.id)} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#FF4D4F', fontSize: 13, fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            ))}
            {printerProfiles.length === 0 && (
              <p style={{ fontSize: 13, color: '#B0B8C4', margin: '0 0 4px' }}>No profiles yet — add your machines below.</p>
            )}
          </div>
          <button onClick={openCreateProfile}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid rgba(0,194,178,0.3)', background: 'rgba(0,194,178,0.04)', color: '#00C2B2', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Add Printer Profile
          </button>
        </Section>

        {/* Job Defaults */}
        <Section title="Job Defaults">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Labour rate (₹/hr)</label>
                <input style={inputStyle} type="number" value={s.labourRateHr} onChange={e => setS(f => ({ ...f, labourRateHr: e.target.value }))} placeholder="100" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 2 }}>
                <label style={labelStyle}>Labour on by default</label>
                <Toggle value={s.labourOn} onChange={v => setS(f => ({ ...f, labourOn: v }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Default failure %</label>
                <input style={inputStyle} type="number" value={s.failurePct} onChange={e => setS(f => ({ ...f, failurePct: e.target.value }))} placeholder="10" />
              </div>
              <div>
                <label style={labelStyle}>Default margin %</label>
                <input style={inputStyle} type="number" value={s.marginPct} onChange={e => setS(f => ({ ...f, marginPct: e.target.value }))} placeholder="30" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button onClick={saveSettings} disabled={updateSettings.isPending}
                style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: updateSettings.isPending ? 'not-allowed' : 'pointer', opacity: updateSettings.isPending ? 0.6 : 1 }}>
                {updateSettings.isPending ? 'Saving…' : 'Save Defaults'}
              </button>
              {settingsMsg && <span style={{ fontSize: 13, fontWeight: 700, color: settingsMsg === 'Saved!' ? '#059669' : '#E11D48' }}>{settingsMsg}</span>}
            </div>
          </div>
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

      {sheet === 'profile' && (
        <Sheet title={editProfileId ? 'Edit Printer Profile' : 'Add Printer Profile'} onClose={() => setSheet(null)}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Profile name *</label>
              <input style={inputStyle} required value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ender 3, Bambu X1" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Printer cost (₹)</label>
                <input style={inputStyle} type="number" required value={profileForm.printerCostRs} onChange={e => setProfileForm(f => ({ ...f, printerCostRs: e.target.value }))} placeholder="80000" />
              </div>
              <div>
                <label style={labelStyle}>Printer life (hr)</label>
                <input style={inputStyle} type="number" required value={profileForm.printerLifeHr} onChange={e => setProfileForm(f => ({ ...f, printerLifeHr: e.target.value }))} placeholder="6000" />
              </div>
              <div>
                <label style={labelStyle}>Power (W)</label>
                <input style={inputStyle} type="number" required value={profileForm.printerPowerW} onChange={e => setProfileForm(f => ({ ...f, printerPowerW: e.target.value }))} placeholder="160" />
              </div>
              <div>
                <label style={labelStyle}>Electricity (₹/kWh)</label>
                <input style={inputStyle} type="number" required value={profileForm.electricityRateKwh} onChange={e => setProfileForm(f => ({ ...f, electricityRateKwh: e.target.value }))} placeholder="10" />
              </div>
            </div>
            {err && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSheet(null)}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={createProfile.isPending || updateProfile.isPending}
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                {(createProfile.isPending || updateProfile.isPending) ? '…' : editProfileId ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

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

      {sheet === 'partner' && (() => {
        const contactsWithEmail = people.filter(p => p.email);
        return (
          <Sheet title="Invite Partner" onClose={() => setSheet(null)}>
            <form onSubmit={handleInvitePartner} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contactsWithEmail.length > 0 && (
                <div>
                  <label style={labelStyle}>From your contacts</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {contactsWithEmail.map(p => {
                      const selected = partnerEmail === p.email;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPartnerEmail(p.email)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                            border: selected ? '1.5px solid #00C2B2' : '1.5px solid #F0F2F7',
                            background: selected ? 'rgba(0,194,178,0.06)' : '#F8F9FB',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: selected ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#E4E7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: selected ? '#fff' : '#6B7280', flexShrink: 0 }}>
                            {p.name[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
                          </div>
                          {selected && <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label style={labelStyle}>{contactsWithEmail.length > 0 ? 'Or enter email manually' : 'Partner\'s HisabKitab email *'}</label>
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
        );
      })()}
    </div>
  );
}
