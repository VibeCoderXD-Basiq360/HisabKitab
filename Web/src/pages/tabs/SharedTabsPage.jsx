import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSharedTabs, useCreateTab, useAcceptTab, useDeclineTab, useDeleteTab } from '../../hooks/useSharedTabs';
import { useTabGroups, useCreateTabGroup, useAcceptTabGroup, useDeclineTabGroup } from '../../hooks/useTabGroups';
import { usePeople } from '../../hooks/usePeople';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(n));

const TEAL_GRADIENT = 'linear-gradient(135deg, #00C2B2 0%, #0097A7 100%)';

function PeoplePicker({ value, onChange, people }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const withEmail = (people || []).filter((p) => p.email);
  const suggestions = withEmail.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase())
  );

  function pick(person) {
    setSelected(person);
    setQuery(person.name);
    onChange(person.email);
    setOpen(false);
  }

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    setSelected(null);
    onChange(v);
    setOpen(true);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          style={{
            marginTop: 4,
            width: '100%',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            background: '#F9FAFB',
            color: '#0A0D14',
            padding: '12px 40px 12px 16px',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
          placeholder={t('tabs.member_picker_placeholder')}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          required
        />
        {selected && (
          <button
            type="button"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#B0B8C4',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
            onClick={() => { setSelected(null); setQuery(''); onChange(''); }}
          >
            ✕
          </button>
        )}
      </div>
      {selected && (
        <p style={{ fontSize: 11, color: '#00C2B2', marginTop: 4, paddingLeft: 4 }}>✓ {selected.email}</p>
      )}
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => pick(p)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: TEAL_GRADIENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {p.name[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 0 && suggestions.length === 0 && !query.includes('@') && (
        <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 4, paddingLeft: 4 }}>{t('tabs.no_match_hint')}</p>
      )}
    </div>
  );
}

/* ─── label styles ─── */
const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: '#B0B8C4',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 8,
  paddingLeft: 4,
};

export default function SharedTabsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tabs = [], isLoading: tabsLoading } = useSharedTabs();
  const { data: groups = [], isLoading: groupsLoading } = useTabGroups();
  const { data: people = [] } = usePeople();
  const createTab = useCreateTab();
  const createGroup = useCreateTabGroup();
  const acceptTab = useAcceptTab();
  const declineTab = useDeclineTab();
  const deleteTab = useDeleteTab();
  const acceptGroup = useAcceptTabGroup();
  const declineGroup = useDeclineTabGroup();
  const user = useAuthStore((s) => s.user);

  // 'none' | 'tab' | 'group' | 'picker'
  const [showCreate, setShowCreate] = useState('none');
  const [form, setForm] = useState({ name: '', memberEmail: '' });
  const [tabType, setTabType] = useState('2person'); // '2person' | 'multi'
  const [memberEmails, setMemberEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [err, setErr] = useState('');

  function resetTabForm() {
    setForm({ name: '', memberEmail: '' });
    setTabType('2person');
    setMemberEmails([]);
    setEmailInput('');
    setErr('');
  }

  function addEmail() {
    const e = emailInput.trim().toLowerCase();
    if (!e || memberEmails.includes(e)) return;
    setMemberEmails((prev) => [...prev, e]);
    setEmailInput('');
  }

  function removeEmail(email) {
    setMemberEmails((prev) => prev.filter((e) => e !== email));
  }

  async function handleCreateTab(ev) {
    ev.preventDefault();
    setErr('');
    try {
      let payload;
      if (tabType === 'multi') {
        const all = emailInput.trim()
          ? [...memberEmails, emailInput.trim().toLowerCase()]
          : memberEmails;
        if (all.length === 0) { setErr('Add at least one member email'); return; }
        payload = { name: form.name, memberEmails: all };
      } else {
        payload = { name: form.name, memberEmail: form.memberEmail };
      }
      const tab = await createTab.mutateAsync(payload);
      setShowCreate('none');
      resetTabForm();
      navigate(`/tabs/${tab.id}`);
    } catch (ex) {
      setErr(ex.response?.data?.error || t('common.error'));
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setErr('');
    try {
      const grp = await createGroup.mutateAsync(form);
      setShowCreate('none');
      setForm({ name: '', memberEmail: '' });
      navigate(`/tab-groups/${grp.id}`);
    } catch (ex) {
      setErr(ex.response?.data?.error || t('common.error'));
    }
  }

  const userId = user?.id;
  const isLoading = tabsLoading || groupsLoading;

  // Standalone tabs only (not part of a group)
  const standaloneTabs = tabs.filter((t) => !t.groupId);
  const receivedInvites = standaloneTabs.filter((t) => t.status === 'PENDING' && t.memberId === userId);
  const sentInvites    = standaloneTabs.filter((t) => t.status === 'PENDING' && t.creatorId === userId);
  const activeTabs     = standaloneTabs.filter((t) => t.status === 'ACTIVE');
  const declinedTabs   = standaloneTabs.filter((t) => t.status === 'DECLINED' && t.creatorId === userId);

  // Groups
  const groupInvites  = groups.filter((g) => g.status === 'PENDING' && g.memberId === userId);
  const groupPending  = groups.filter((g) => g.status === 'PENDING' && g.creatorId === userId);
  const activeGroups  = groups.filter((g) => g.status === 'ACTIVE');

  const isEmpty = tabs.length === 0 && groups.length === 0;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar
        title={t('tabs.title')}
        showBack
        action={
          <button
            onClick={() => setShowCreate('picker')}
            style={{
              background: TEAL_GRADIENT,
              borderRadius: 12,
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            + {t('tabs.new') || 'New Tab'}
          </button>
        }
      />

      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 96, borderRadius: 20, background: '#E8EAF0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!isLoading && isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
            <span style={{ fontSize: 48, marginBottom: 16 }}>🤝</span>
            <p style={{ fontWeight: 700, color: '#0A0D14', marginBottom: 4 }}>{t('tabs.empty_title')}</p>
            <p style={{ fontSize: 13, color: '#B0B8C4' }}>{t('tabs.empty_sub')}</p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                marginTop: 24,
                padding: '10px 20px',
                background: TEAL_GRADIENT,
                color: '#fff',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t('tabs.create')}
            </button>
          </div>
        )}

        {/* Group invites received */}
        {groupInvites.length > 0 && (
          <section>
            <p style={sectionLabel}>🗂 Group Invites</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupInvites.map((g) => (
                <SurfaceCard key={g.id} style={{ borderLeft: '3px solid #00C2B2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>from {g.creator?.name || g.creator?.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => declineGroup.mutate(g.id)}
                      disabled={declineGroup.isPending}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => acceptGroup.mutate(g.id, { onSuccess: (d) => navigate(`/tab-groups/${d.id}`) })}
                      disabled={acceptGroup.isPending}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: TEAL_GRADIENT, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ Accept
                    </button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}

        {/* Active groups */}
        {activeGroups.length > 0 && (
          <section>
            <p style={sectionLabel}>Monthly Groups</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeGroups.map((g) => {
                const other = g.creatorId === userId ? g.member : g.creator;
                const net = g.tabs.reduce((sum, t) => sum + (t.balance?.net || 0), 0);
                const activeMonth = g.tabs.find((t) => t.status === 'ACTIVE');
                return (
                  <SurfaceCard key={g.id} onClick={() => navigate(`/tab-groups/${g.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                        <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          with {other?.name || other?.email}
                          {activeMonth ? ` · ${activeMonth.name}` : ''}
                          {g.tabs.length > 1 ? ` · ${g.tabs.length} months` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {Math.abs(net) < 0.01 ? (
                          <Badge variant="active" label="Settled" />
                        ) : net > 0 ? (
                          <p style={{ fontWeight: 700, color: '#00C2B2', fontSize: 14 }}>{fmt(net)}</p>
                        ) : (
                          <p style={{ fontWeight: 700, color: '#F43F5E', fontSize: 14 }}>{fmt(net)}</p>
                        )}
                        <p style={{ color: '#D1D5DB', fontSize: 18, lineHeight: 1 }}>›</p>
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending group invites sent */}
        {groupPending.length > 0 && (
          <section>
            <p style={sectionLabel}>Group Invites Sent</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupPending.map((g) => (
                <SurfaceCard key={g.id} style={{ opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4' }}>⏳ Waiting for {g.member?.name || g.member?.email}</p>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}

        {/* Received invites (standalone tabs) */}
        {receivedInvites.length > 0 && (
          <section>
            <p style={sectionLabel}>{t('tabs.invites_received')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {receivedInvites.map((tab) => (
                <SurfaceCard key={tab.id} style={{ borderLeft: '3px solid #00C2B2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: TEAL_GRADIENT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {(tab.creator?.name || tab.creator?.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t('tabs.invited_by')} {tab.creator?.name || tab.creator?.email}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => declineTab.mutate(tab.id)}
                      disabled={declineTab.isPending}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {t('tabs.decline')}
                    </button>
                    <button
                      onClick={() => acceptTab.mutate(tab.id)}
                      disabled={acceptTab.isPending}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: TEAL_GRADIENT, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ {t('tabs.accept')}
                    </button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}

        {/* Active tabs */}
        {activeTabs.length > 0 && (
          <section>
            <p style={sectionLabel}>{t('tabs.active')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTabs.map((tab) => {
                const { balance } = tab;
                const isMultiMember = !tab.memberId;
                const other = !isMultiMember ? (tab.creatorId === userId ? tab.member : tab.creator) : null;
                const memberNames = isMultiMember
                  ? tab.members.filter((m) => m.userId !== userId).map((m) => m.name || m.user?.name || m.user?.email).join(', ')
                  : null;
                const totalOwed = isMultiMember ? (balance.totalOwed || 0) : Math.max(0, balance.net);
                const totalOwe  = isMultiMember ? (balance.totalOwe  || 0) : Math.max(0, -balance.net);
                const isSettled = totalOwed < 0.01 && totalOwe < 0.01;

                return (
                  <SurfaceCard key={tab.id} onClick={() => navigate(`/tabs/${tab.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: TEAL_GRADIENT,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMultiMember ? 20 : 17,
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {isMultiMember ? '👥' : (other?.name || other?.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</p>
                        <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isMultiMember
                            ? `${tab.members.length} members · ${memberNames}`
                            : `${t('tabs.with')} ${other?.name || other?.email}`}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {isSettled ? (
                          <Badge variant="active" label={t('common.all_settled')} />
                        ) : totalOwed > 0.01 ? (
                          <>
                            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('tabs.they_owe')}</p>
                            <p style={{ fontWeight: 700, color: '#00C2B2', fontSize: 14 }}>{fmt(totalOwed)}</p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 11, color: '#B0B8C4' }}>{t('tabs.you_owe')}</p>
                            <p style={{ fontWeight: 700, color: '#F43F5E', fontSize: 14 }}>{fmt(totalOwe)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </section>
        )}

        {/* Sent invites – waiting */}
        {sentInvites.length > 0 && (
          <section>
            <p style={sectionLabel}>{t('tabs.invites_sent')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sentInvites.map((tab) => (
                <SurfaceCard key={tab.id} style={{ opacity: 0.8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#B0B8C4',
                        flexShrink: 0,
                      }}
                    >
                      {(tab.member?.name || tab.member?.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ⏳ {t('tabs.waiting_for')} {tab.member?.name || tab.member?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTab.mutate(tab.id)}
                      style={{ fontSize: 11, color: '#F43F5E', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}

        {/* Declined */}
        {declinedTabs.length > 0 && (
          <section>
            <p style={sectionLabel}>{t('tabs.declined')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {declinedTabs.map((tab) => (
                <SurfaceCard key={tab.id} style={{ opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#FFF1F3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#F43F5E',
                        flexShrink: 0,
                      }}
                    >
                      {(tab.member?.name || tab.member?.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.name}</p>
                      <p style={{ fontSize: 11, color: '#F43F5E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ✗ {tab.member?.name || tab.member?.email} {t('tabs.declined_it')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTab.mutate(tab.id)}
                      style={{ fontSize: 11, color: '#B0B8C4', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create picker sheet */}
      {showCreate === 'picker' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowCreate('none')} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14' }}>What do you want to create?</h2>
            <button
              onClick={() => { setErr(''); setForm({ name: '', memberEmail: '' }); setShowCreate('group'); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                borderRadius: 16,
                border: '2px solid #99F6E4',
                background: '#F0FDF9',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 28 }}>🗂️</span>
              <div>
                <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 14 }}>Monthly Group</p>
                <p style={{ fontSize: 11, color: '#B0B8C4' }}>Like "Ghar Kharch" — tracks month by month, stores history</p>
              </div>
            </button>
            <button
              onClick={() => { setErr(''); setForm({ name: '', memberEmail: '' }); setShowCreate('tab'); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                borderRadius: 16,
                border: '2px solid #A7F3D0',
                background: '#F0FDF9',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 28 }}>🤝</span>
              <div>
                <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 14 }}>Single Tab</p>
                <p style={{ fontSize: 11, color: '#B0B8C4' }}>One-off shared list — trip, event, project</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Create Group sheet */}
      {showCreate === 'group' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowCreate('none')} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14' }}>🗂️ Create Monthly Group</h2>
            <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: -8 }}>Give it a name like "Ghar Kharch" or "Flat 4B Expenses". Each month gets its own tab automatically.</p>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Group Name</label>
                <input
                  style={{ marginTop: 4, width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#0A0D14', padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. Ghar Kharch, Flat 4B Expenses"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('tabs.member_email')}</label>
                <PeoplePicker value={form.memberEmail} onChange={(email) => setForm((f) => ({ ...f, memberEmail: email }))} people={people} />
              </div>
              {err && <p style={{ fontSize: 13, color: '#F43F5E' }}>{err}</p>}
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCreate('none')} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('common.cancel')}</button>
                <button type="submit" disabled={createGroup.isPending} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: TEAL_GRADIENT, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: createGroup.isPending ? 0.6 : 1 }}>
                  {createGroup.isPending ? t('common.saving') : t('tabs.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tab sheet */}
      {showCreate === 'tab' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => { setShowCreate('none'); resetTabForm(); }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14' }}>{t('tabs.create')}</h2>

            {/* Type toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => setTabType('2person')}
                style={{
                  padding: '10px 0',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  border: tabType === '2person' ? 'none' : '1px solid #E5E7EB',
                  background: tabType === '2person' ? TEAL_GRADIENT : '#F9FAFB',
                  color: tabType === '2person' ? '#fff' : '#6B7280',
                  cursor: 'pointer',
                }}
              >
                🤝 Just 2 people
              </button>
              <button
                type="button"
                onClick={() => setTabType('multi')}
                style={{
                  padding: '10px 0',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  border: tabType === 'multi' ? 'none' : '1px solid #E5E7EB',
                  background: tabType === 'multi' ? TEAL_GRADIENT : '#F9FAFB',
                  color: tabType === 'multi' ? '#fff' : '#6B7280',
                  cursor: 'pointer',
                }}
              >
                👥 Group (3+)
              </button>
            </div>

            <form onSubmit={handleCreateTab} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('tabs.tab_name')}</label>
                <input
                  style={{ marginTop: 4, width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#0A0D14', padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder={t('tabs.tab_name_placeholder')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {tabType === '2person' ? (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('tabs.member_email')}</label>
                  <PeoplePicker value={form.memberEmail} onChange={(email) => setForm((f) => ({ ...f, memberEmail: email }))} people={people} />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Members ({memberEmails.length} added)
                  </label>
                  <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 2, marginBottom: 8 }}>
                    All members get equal split. Tab is active immediately — no invite needed.
                  </p>
                  {memberEmails.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                      {memberEmails.map((e) => (
                        <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF9', borderRadius: 12, padding: '8px 12px' }}>
                          <span style={{ flex: 1, fontSize: 13, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e}</span>
                          <button type="button" onClick={() => removeEmail(e)} style={{ color: '#B0B8C4', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <PeoplePicker
                        value={emailInput}
                        onChange={setEmailInput}
                        people={people.filter((p) => !memberEmails.includes(p.email))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addEmail}
                      style={{ flexShrink: 0, padding: '0 12px', background: TEAL_GRADIENT, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', alignSelf: 'flex-start', marginTop: 4, height: 44, cursor: 'pointer' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {err && <p style={{ fontSize: 13, color: '#F43F5E' }}>{err}</p>}
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowCreate('none'); resetTabForm(); }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createTab.isPending}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: TEAL_GRADIENT, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: createTab.isPending ? 0.6 : 1 }}
                >
                  {createTab.isPending ? t('common.saving') : tabType === 'multi' ? 'Create Group Tab' : t('tabs.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
