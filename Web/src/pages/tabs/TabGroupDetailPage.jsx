import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabGroup, useNewMonth, useDeleteTabGroup, useAcceptTabGroup, useDeclineTabGroup } from '../../hooks/useTabGroups';
import { useAuthStore } from '../../store/authStore';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(n));

export default function TabGroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const { data: group, isLoading } = useTabGroup(id);
  const newMonth = useNewMonth();
  const deleteGroup = useDeleteTabGroup();
  const acceptGroup = useAcceptTabGroup();
  const declineGroup = useDeclineTabGroup();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newMonthErr, setNewMonthErr] = useState('');

  if (isLoading) {
    return (
      <div style={{ minHeight:'100vh', background:'#F0F2F7', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'#B0B8C4' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ minHeight:'100vh', background:'#F0F2F7', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ color:'#B0B8C4' }}>Not found</p>
      </div>
    );
  }

  const isCreator = group.creatorId === user?.id;
  const isMember = group.memberId === user?.id;
  const isPending = group.status === 'PENDING';
  const other = isCreator ? group.member : group.creator;

  const activeTabs = group.tabs.filter((t) => t.status === 'ACTIVE');
  const closedTabs = group.tabs.filter((t) => t.status === 'CLOSED');
  const activeTab = activeTabs[0];

  const cumulativeNet = group.tabs.reduce((sum, t) => sum + (t.balance?.net || 0), 0);

  async function handleNewMonth() {
    setNewMonthErr('');
    try {
      const tab = await newMonth.mutateAsync(id);
      navigate(`/tabs/${tab.id}`);
    } catch (ex) {
      setNewMonthErr(ex.response?.data?.error || t('common.error'));
    }
  }

  async function handleDeleteGroup() {
    await deleteGroup.mutateAsync(id);
    navigate('/tabs');
  }

  function balanceText(tab) {
    const b = tab.balance;
    if (!b) return null;
    if (Math.abs(b.net) < 0.01) return { text: 'Settled', color: '#059669' };
    if (b.net > 0) return { text: `+${fmt(b.net)}`, color: '#059669' };
    return { text: `−${fmt(Math.abs(b.net))}`, color: '#E11D48' };
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F0F2F7', paddingBottom:'calc(100px + env(safe-area-inset-bottom))' }}>

      {/* Header — dark navy hero */}
      <div style={{ background:'linear-gradient(135deg,#0D1B2A 0%,#1B2E45 60%,#0D2137 100%)', padding:'52px 20px 24px', boxShadow:'0 4px 20px rgba(13,27,42,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <button
            onClick={() => navigate('/tabs')}
            style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'rgba(255,255,255,0.8)', fontSize:13, fontWeight:600, padding:'7px 14px', borderRadius:20, cursor:'pointer' }}
          >
            ← {t('common.back')}
          </button>
          {isCreator && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background:'none', border:'none', color:'#E11D48', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              {t('common.delete')}
            </button>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:18, background:'rgba(0,194,178,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
            🗂️
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:4 }}>{group.name}</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>with {other?.name || other?.email}</p>
          </div>
        </div>

        {group.status === 'ACTIVE' && (
          <Badge
            variant={isPending ? 'pending' : 'active'}
            label={isPending ? 'Pending' : 'Active'}
            style={{ marginTop:14, fontSize:10 }}
          />
        )}
      </div>

      <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Pending invite banner */}
        {isPending && (
          <div style={{ background:'#FFFBEB', borderRadius:18, padding:'16px 18px', border:'1px solid #FDE68A' }}>
            {isMember ? (
              <>
                <p style={{ fontSize:14, fontWeight:700, color:'#92400E', marginBottom:6 }}>
                  🗂️ {other?.name || other?.email} invited you to "{group.name}"
                </p>
                <p style={{ fontSize:12, color:'#B45309', marginBottom:14 }}>
                  Accept to start tracking monthly household expenses together.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={() => declineGroup.mutate(id, { onSuccess: () => navigate('/tabs') })}
                    disabled={declineGroup.isPending}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid #FDE68A', background:'#fff', color:'#92400E', fontSize:13, fontWeight:600, cursor:'pointer', opacity: declineGroup.isPending ? 0.6 : 1 }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => acceptGroup.mutate(id)}
                    disabled={acceptGroup.isPending}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#00C2B2,#009E91)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity: acceptGroup.isPending ? 0.6 : 1 }}
                  >
                    ✓ Accept
                  </button>
                </div>
              </>
            ) : (
              <p style={{ fontSize:13, color:'#92400E' }}>
                ⏳ Waiting for {other?.name || other?.email} to accept…
              </p>
            )}
          </div>
        )}

        {group.status === 'ACTIVE' && (
          <>
            {/* Cumulative balance summary */}
            {group.tabs.length > 0 && (
              <SurfaceCard style={{ textAlign:'center' }}>
                <p style={{ fontSize:11, color:'#B0B8C4', marginBottom:8 }}>Overall balance across all months</p>
                {Math.abs(cumulativeNet) < 0.01 ? (
                  <p style={{ fontSize:22, fontWeight:800, color:'#059669' }}>✓ All settled</p>
                ) : cumulativeNet > 0 ? (
                  <>
                    <p style={{ fontSize:11, color:'#B0B8C4', marginBottom:4 }}>{other?.name} owes you</p>
                    <p style={{ fontSize:26, fontWeight:800, color:'#059669' }}>{fmt(cumulativeNet)}</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize:11, color:'#B0B8C4', marginBottom:4 }}>You owe {other?.name}</p>
                    <p style={{ fontSize:26, fontWeight:800, color:'#E11D48' }}>{fmt(cumulativeNet)}</p>
                  </>
                )}
              </SurfaceCard>
            )}

            {/* Current Month */}
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                Current Month
              </p>
              {activeTab ? (
                <SurfaceCard onClick={() => navigate(`/tabs/${activeTab.id}`)}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:14, background:'#E6FAF8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                      📅
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0A0D14', marginBottom:3 }}>{activeTab.name}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Badge variant="active" label="Active" style={{ fontSize:8 }} />
                        <span style={{ fontSize:11, color:'#B0B8C4' }}>{activeTab.entries?.length || 0} entries</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {(() => { const b = balanceText(activeTab); return b ? <p style={{ fontSize:13, fontWeight:700, color: b.color, marginBottom:2 }}>{b.text}</p> : null; })()}
                      <span style={{ fontSize:18, color:'#B0B8C4' }}>›</span>
                    </div>
                  </div>
                </SurfaceCard>
              ) : (
                <SurfaceCard style={{ textAlign:'center' }}>
                  <p style={{ fontSize:13, color:'#B0B8C4' }}>No active month tab yet.</p>
                </SurfaceCard>
              )}

              {/* New month button */}
              <button
                onClick={handleNewMonth}
                disabled={newMonth.isPending}
                style={{
                  marginTop:10, width:'100%', padding:'13px', borderRadius:14,
                  border:'2px dashed #00C2B2', background:'transparent',
                  color:'#00C2B2', fontSize:13, fontWeight:700, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  opacity: newMonth.isPending ? 0.5 : 1,
                }}
              >
                {newMonth.isPending ? 'Creating…' : '+ Start New Month'}
              </button>
              {newMonthErr && <p style={{ fontSize:11, color:'#E11D48', marginTop:6, textAlign:'center' }}>{newMonthErr}</p>}
            </div>

            {/* Past months */}
            {closedTabs.length > 0 && (
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                  Past Months ({closedTabs.length})
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {closedTabs.map((tab) => {
                    const b = balanceText(tab);
                    return (
                      <SurfaceCard key={tab.id} onClick={() => navigate(`/tabs/${tab.id}`)} style={{ opacity:0.85 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ width:44, height:44, borderRadius:14, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                            🔒
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:14, fontWeight:700, color:'#0A0D14', marginBottom:3 }}>{tab.name}</p>
                            <p style={{ fontSize:11, color:'#B0B8C4' }}>{tab.entries?.length || 0} entries</p>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            {b && <p style={{ fontSize:13, fontWeight:700, color: b.color, marginBottom:2 }}>{b.text}</p>}
                            <span style={{ fontSize:18, color:'#B0B8C4' }}>›</span>
                          </div>
                        </div>
                      </SurfaceCard>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ position:'relative', background:'#fff', borderRadius:22, padding:24, width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:14 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#0A0D14' }}>Delete "{group.name}"?</h3>
            <p style={{ fontSize:13, color:'#374151' }}>
              This will delete all monthly tabs, entries, and settlements inside this group.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid #E5E7EB', background:'#fff', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroup.isPending}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'#E11D48', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity: deleteGroup.isPending ? 0.6 : 1 }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
