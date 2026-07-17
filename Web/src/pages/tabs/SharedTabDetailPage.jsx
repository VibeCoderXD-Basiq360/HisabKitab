import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useSharedTab,
  useDeleteTab,
  useAddEntry,
  useUpdateEntry,
  useDeleteEntry,
  useAddSettlement,
  useDeleteSettlement,
  useAcceptTab,
  useDeclineTab,
} from '../../hooks/useSharedTabs';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import TransactionRow from '../../components/ui/TransactionRow';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Math.abs(n));

const today = () => new Date().toISOString().split('T')[0];

const SPLIT_TYPES = ['THEIRS_ONLY', 'SPLIT'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function SharedTabDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const { data: tab, isLoading } = useSharedTab(id);
  const deleteTab = useDeleteTab();
  const addEntry = useAddEntry(id);
  const updateEntry = useUpdateEntry(id);
  const deleteEntry = useDeleteEntry(id);
  const addSettlement = useAddSettlement(id);
  const deleteSettlement = useDeleteSettlement(id);
  const acceptTab = useAcceptTab();
  const declineTab = useDeclineTab();

  const [activeTab, setActiveTab] = useState('entries');
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showSettle, setShowSettle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const EMPTY_ENTRY = { description: '', amount: '', date: today(), splitType: 'THEIRS_ONLY', splitRatio: 50, category: '', note: '' };
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [settleForm, setSettleForm] = useState({ amount: '', note: '', date: today(), toUserId: '' });
  const [entryErr, setEntryErr] = useState('');
  const [settleErr, setSettleErr] = useState('');

  const grouped = useMemo(() => {
    if (!tab?.entries) return [];
    const map = {};
    for (const entry of tab.entries) {
      const day = new Date(entry.date).toISOString().slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(entry);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [tab?.entries]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (!tab) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Not found</p>
      </div>
    );
  }

  const { balance } = tab;
  const isMultiMember = !tab.memberId;
  const other = !isMultiMember ? (tab.creatorId === user?.id ? tab.member : tab.creator) : null;
  const otherMembers = isMultiMember
    ? (tab.members || []).filter((m) => m.userId !== user?.id)
    : [];

  const isPending = tab.status === 'PENDING';
  const isCreator = tab.creatorId === user?.id;
  const isMember = tab.memberId === user?.id;

  const isSettled2 = !isMultiMember && Math.abs(balance.net) < 0.01;
  const totalOwed = isMultiMember ? (balance.totalOwed || 0) : 0;
  const totalOwe  = isMultiMember ? (balance.totalOwe  || 0) : 0;
  const isSettledMulti = isMultiMember && totalOwed < 0.01 && totalOwe < 0.01;
  const isSettled = isMultiMember ? isSettledMulti : isSettled2;

  async function handleAddEntry(e) {
    e.preventDefault();
    setEntryErr('');
    try {
      const payload = isMultiMember
        ? { description: entryForm.description, amount: entryForm.amount, date: entryForm.date, category: entryForm.category, note: entryForm.note }
        : entryForm;
      if (editingEntry) {
        await updateEntry.mutateAsync({ entryId: editingEntry.id, ...payload });
      } else {
        await addEntry.mutateAsync(payload);
      }
      setShowAddEntry(false);
      setEditingEntry(null);
      setEntryForm(EMPTY_ENTRY);
    } catch (ex) {
      setEntryErr(ex.response?.data?.error || t('common.error'));
    }
  }

  function openEditEntry(entry) {
    setEntryForm({
      description: entry.description,
      amount: String(Number(entry.amount)),
      date: new Date(entry.date).toISOString().split('T')[0],
      splitType: entry.splitType,
      splitRatio: entry.splitRatio,
      category: entry.category || '',
      note: entry.note || '',
    });
    setEditingEntry(entry);
    setEntryErr('');
    setShowAddEntry(true);
  }

  async function handleSettle(e) {
    e.preventDefault();
    setSettleErr('');
    try {
      await addSettlement.mutateAsync(settleForm);
      setShowSettle(false);
      setSettleForm({ amount: '', note: '', date: today(), toUserId: '' });
    } catch (ex) {
      setSettleErr(ex.response?.data?.error || t('common.error'));
    }
  }

  async function handleDeleteEntry(entryId) {
    await deleteEntry.mutateAsync(entryId);
  }

  async function handleDeleteTab() {
    await deleteTab.mutateAsync(id);
    navigate('/tabs');
  }

  function dayLabel(dateStr) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const splitTypeLabel = (type) => {
    if (type === 'MINE_ONLY') return t('tabs.mine_only');
    if (type === 'THEIRS_ONLY') return t('tabs.theirs_only');
    return t('tabs.split');
  };

  const splitTypeVariant = (type) => {
    if (type === 'MINE_ONLY') return 'neutral';
    if (type === 'THEIRS_ONLY') return 'warning';
    return 'requested';
  };

  const memberCount = isMultiMember ? (tab.members || []).filter(m => m.userId).length : 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title={tab.name} showBack onBack={() => tab.groupId ? navigate(`/tab-groups/${tab.groupId}`) : navigate('/tabs')} />

      {/* Tab header — dark navy gradient card */}
      <div style={{ margin: '12px 16px 0', borderRadius: 22, padding: 20, background: 'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.name}
            </p>
            {isMultiMember ? (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
                👥 {(tab.members || []).length} members
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>
                {t('tabs.with')} {other?.name || other?.email}
              </p>
            )}
          </div>
          {tab.status === 'CLOSED' && <Badge variant="neutral" label="Closed" />}
        </div>

        {/* Balance summary */}
        {!isPending && (
          isMultiMember ? (
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>You're owed</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: totalOwed > 0.01 ? '#4ADE80' : 'rgba(255,255,255,0.4)', margin: 0 }}>{fmt(totalOwed)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>You owe</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: totalOwe > 0.01 ? '#F87171' : 'rgba(255,255,255,0.4)', margin: 0 }}>{fmt(totalOwe)}</p>
              </div>
            </div>
          ) : (
            isSettled2 ? (
              <p style={{ fontSize: 22, fontWeight: 800, color: '#4ADE80', margin: 0 }}>✓ {t('common.all_settled')}</p>
            ) : balance.net > 0 ? (
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{other?.name || other?.email} owes you</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#4ADE80', margin: 0, letterSpacing: '-0.5px' }}>{fmt(balance.net)}</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>You owe {other?.name || other?.email}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#F87171', margin: 0, letterSpacing: '-0.5px' }}>{fmt(balance.net)}</p>
              </div>
            )
          )
        )}

        {/* Action buttons */}
        {!isPending && tab.status !== 'CLOSED' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => setShowAddEntry(true)}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + {t('tabs.add_entry')}
            </button>
            {!isSettled && (
              <button
                onClick={() => {
                  if (!isMultiMember) {
                    setSettleForm((f) => ({ ...f, amount: String(Math.round(balance.youOwe * 100) / 100) }));
                  }
                  setShowSettle(true);
                }}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                💸 {t('tabs.settle_up')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending banner — 2-person only */}
      {isPending && !isMultiMember && (
        <div style={{ margin: '12px 16px 0', borderRadius: 16, padding: 16, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          {isMember ? (
            <>
              <p style={{ fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 4 }}>
                🤝 {t('tabs.invite_pending_member', { name: other?.name || other?.email })}
              </p>
              <p style={{ fontSize: 12, color: '#B45309', marginBottom: 12 }}>{t('tabs.invite_pending_member_sub')}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => declineTab.mutate(id, { onSuccess: () => navigate('/tabs') })}
                  disabled={declineTab.isPending}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid #FCD34D', background: 'transparent', color: '#92400E', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('tabs.decline')}
                </button>
                <button
                  onClick={() => acceptTab.mutate(id)}
                  disabled={acceptTab.isPending}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
                >
                  ✓ {t('tabs.accept')}
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: '#92400E' }}>
              ⏳ {t('tabs.invite_pending_creator', { name: other?.name || other?.email })}
            </p>
          )}
        </div>
      )}

      {/* Closed banner */}
      {tab.status === 'CLOSED' && (
        <div style={{ margin: '12px 16px 0' }}>
          <SurfaceCard style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>This month is closed</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Entries and settlements are locked. View only.</p>
            </div>
            {tab.groupId && (
              <button
                onClick={() => navigate(`/tab-groups/${tab.groupId}`)}
                style={{ fontSize: 12, fontWeight: 700, color: '#009E90', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                Group →
              </button>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* Multi-member balance breakdown */}
      {!isPending && isMultiMember && (balance.members || []).length > 0 && !isSettledMulti && (
        <div style={{ margin: '12px 16px 0' }}>
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F0F2F7' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Balances</p>
            </div>
            {(balance.members || []).map((m, idx, arr) => (
              <TransactionRow
                key={m.userId}
                icon={initials(m.name || '?')}
                iconBg={m.net > 0.01 ? 'linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)' : m.net < -0.01 ? 'linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)' : '#F0F2F7'}
                title={m.name}
                subtitle={null}
                isLast={idx === arr.length - 1}
                rightSlot={
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.net > 0.01 ? '#059669' : m.net < -0.01 ? '#E11D48' : '#9CA3AF' }}>
                    {m.net > 0.01 ? `+${fmt(m.net)}` : m.net < -0.01 ? `-${fmt(m.net)}` : 'Settled'}
                  </span>
                }
              />
            ))}
            {isSettledMulti && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: 0 }}>✓ {t('common.all_settled')}</p>
              </div>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ margin: '12px 16px 0', display: 'flex', gap: 8 }}>
        {['entries', 'settlements'].map((t2) => (
          <button
            key={t2}
            onClick={() => setActiveTab(t2)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === t2
                ? 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)'
                : '#fff',
              color: activeTab === t2 ? '#fff' : '#9CA3AF',
              boxShadow: activeTab === t2 ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {t2 === 'entries' ? t('tabs.entries') : t('tabs.settlements')}
          </button>
        ))}
      </div>

      {/* Entries list */}
      {activeTab === 'entries' && (
        <div style={{ margin: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab.entries.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: 14 }}>{t('tabs.no_entries')}</p>
          )}
          {grouped.map(([dateStr, entries]) => (
            <div key={dateStr}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  {dayLabel(dateStr)}
                </p>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                  {fmt(entries.reduce((s, e) => s + Number(e.amount), 0))}
                </p>
              </div>

              <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                {entries.map((entry, idx) => {
                  const iMadeit = entry.paidById === user?.id;
                  const entryAmt = Number(entry.amount);
                  const debtAmt = isMultiMember
                    ? entryAmt / memberCount
                    : entry.splitType === 'MINE_ONLY' ? 0
                    : entry.splitType === 'THEIRS_ONLY' ? entryAmt
                    : entryAmt * (entry.splitRatio / 100);

                  const subtitleParts = [
                    iMadeit ? t('tabs.paid_by_you') : `${t('tabs.paid_by')} ${entry.paidBy?.name || entry.paidBy?.email}`,
                    entry.category || null,
                    entry.note ? `"${entry.note}"` : null,
                  ].filter(Boolean);

                  const rightSlot = (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', letterSpacing: '-0.3px' }}>{fmt(entryAmt)}</span>
                      {((!isMultiMember && entry.splitType !== 'MINE_ONLY') || isMultiMember) && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: iMadeit ? '#059669' : '#E11D48' }}>
                          {iMadeit ? `+${fmt(debtAmt)}` : `-${fmt(debtAmt)}`}
                        </span>
                      )}
                      {isMultiMember ? (
                        <Badge variant="requested" label={`Split ${memberCount} ways`} />
                      ) : (
                        <Badge variant={splitTypeVariant(entry.splitType)} label={splitTypeLabel(entry.splitType)} />
                      )}
                      {(iMadeit || isCreator) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                          {iMadeit && (
                            <button
                              onClick={() => openEditEntry(entry)}
                              style={{ fontSize: 11, color: '#009E90', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                            >
                              {t('common.edit')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            style={{ fontSize: 11, color: '#E11D48', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <TransactionRow
                      key={entry.id}
                      icon={entry.category ? entry.category[0].toUpperCase() : '📋'}
                      iconBg="linear-gradient(135deg, #E6FAF9 0%, #B2F0EB 100%)"
                      title={entry.description}
                      subtitle={subtitleParts.join(' · ')}
                      isLast={idx === entries.length - 1}
                      rightSlot={rightSlot}
                    />
                  );
                })}
              </SurfaceCard>
            </div>
          ))}
        </div>
      )}

      {/* Settlements list */}
      {activeTab === 'settlements' && (
        <div style={{ margin: '12px 16px 0' }}>
          {tab.settlements.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: 14 }}>{t('tabs.no_settlements')}</p>
          )}
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {tab.settlements.map((s, idx) => {
              const iMadeIt = s.paidById === user?.id;
              const receiver = s.toUser || (tab.creatorId === s.paidById ? tab.member : tab.creator);
              return (
                <TransactionRow
                  key={s.id}
                  icon="💸"
                  iconBg="linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)"
                  title={
                    iMadeIt
                      ? `${t('tabs.you_paid')} ${receiver?.name || receiver?.email || ''}`
                      : `${s.paidBy?.name || s.paidBy?.email} ${t('tabs.paid')}`
                  }
                  subtitle={[
                    s.note ? `"${s.note}"` : null,
                    new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                  ].filter(Boolean).join(' · ')}
                  isLast={idx === tab.settlements.length - 1}
                  rightSlot={
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: 0 }}>{fmt(Number(s.amount))}</p>
                      {(iMadeIt || isCreator) && (
                        <button
                          onClick={() => deleteSettlement.mutate(s.id)}
                          disabled={deleteSettlement.isPending}
                          style={{ fontSize: 11, color: '#E11D48', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, marginTop: 4 }}
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  }
                />
              );
            })}
          </SurfaceCard>
        </div>
      )}

      {/* Delete tab button */}
      {isCreator && (
        <div style={{ margin: '16px 16px 0' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              background: '#FFF1F3',
              color: '#E11D48',
              fontWeight: 700,
              fontSize: 14,
              border: '1px solid #FECDD3',
              cursor: 'pointer',
            }}
          >
            {t('tabs.delete_tab')}
          </button>
        </div>
      )}

      {/* Add Entry Sheet */}
      {showAddEntry && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddEntry(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', padding: 20, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
              {editingEntry ? `${t('common.edit')} ${t('tabs.entry')}` : t('tabs.add_entry')}
            </h2>
            {isMultiMember && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: -8 }}>
                Split equally among all {(tab.members || []).filter(m => m.userId).length} members
              </p>
            )}
            <form onSubmit={handleAddEntry} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label={t('tabs.description')}>
                <input
                  style={inputStyle}
                  placeholder={t('tabs.description_placeholder')}
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </Field>
              <Field label={t('tabs.amount')}>
                <input
                  style={inputStyle}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </Field>
              <Field label={t('tabs.date')}>
                <input
                  style={inputStyle}
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </Field>

              {/* Split type — 2-person only */}
              {!isMultiMember && (
                <>
                  <div>
                    <label style={labelStyle}>{t('tabs.split_type')}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                      {SPLIT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEntryForm((f) => ({ ...f, splitType: type }))}
                          style={{
                            padding: '9px 8px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: entryForm.splitType === type ? 'none' : '1px solid #E5E7EB',
                            background: entryForm.splitType === type
                              ? 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)'
                              : '#F9FAFB',
                            color: entryForm.splitType === type ? '#fff' : '#6B7280',
                          }}
                        >
                          {splitTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                      {entryForm.splitType === 'THEIRS_ONLY' && t('tabs.theirs_only_hint', { name: other?.name || other?.email })}
                      {entryForm.splitType === 'SPLIT' && t('tabs.split_hint')}
                    </p>
                  </div>

                  {entryForm.splitType === 'SPLIT' && (
                    <div>
                      <label style={labelStyle}>
                        {t('tabs.their_share')}: {entryForm.splitRatio}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={entryForm.splitRatio}
                        onChange={(e) => setEntryForm((f) => ({ ...f, splitRatio: Number(e.target.value) }))}
                        style={{ width: '100%', marginTop: 8, accentColor: '#009E90' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        <span>{t('tabs.you')}: {100 - entryForm.splitRatio}%</span>
                        <span>{other?.name || t('tabs.them')}: {entryForm.splitRatio}%</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Field label={`${t('tabs.category')} (${t('common.optional')})`}>
                <input
                  style={inputStyle}
                  placeholder={t('tabs.category_placeholder')}
                  value={entryForm.category}
                  onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value }))}
                />
              </Field>
              <Field label={`${t('tabs.note')} (${t('common.optional')})`}>
                <input
                  style={inputStyle}
                  placeholder={t('tabs.note_placeholder')}
                  value={entryForm.note}
                  onChange={(e) => setEntryForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Field>

              {entryErr && <p style={{ fontSize: 13, color: '#E11D48' }}>{entryErr}</p>}
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowAddEntry(false); setEditingEntry(null); setEntryForm(EMPTY_ENTRY); }}
                  style={{ flex: 1, padding: '13px 16px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addEntry.isPending || updateEntry.isPending}
                  style={{
                    flex: 1,
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #009E90 0%, #00C9B8 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    opacity: (addEntry.isPending || updateEntry.isPending) ? 0.6 : 1,
                  }}
                >
                  {(addEntry.isPending || updateEntry.isPending) ? t('common.saving') : editingEntry ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Sheet */}
      {showSettle && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettle(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A0D14', margin: 0 }}>💸 {t('tabs.settle_up')}</h2>
            <form onSubmit={handleSettle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* "Pay to" picker — multi-member only */}
              {isMultiMember && (
                <Field label="Pay to">
                  <select
                    style={inputStyle}
                    value={settleForm.toUserId}
                    onChange={(e) => setSettleForm((f) => ({ ...f, toUserId: e.target.value }))}
                    required
                  >
                    <option value="">Select member…</option>
                    {otherMembers.map((m) => (
                      <option key={m.userId || m.id} value={m.userId}>
                        {m.name || m.user?.name || m.user?.email}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label={t('tabs.amount')}>
                <input
                  style={inputStyle}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </Field>
              <Field label={t('tabs.date')}>
                <input
                  style={inputStyle}
                  type="date"
                  value={settleForm.date}
                  onChange={(e) => setSettleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label={`${t('tabs.note')} (${t('common.optional')})`}>
                <input
                  style={inputStyle}
                  placeholder={t('tabs.settle_note_placeholder')}
                  value={settleForm.note}
                  onChange={(e) => setSettleForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Field>
              {settleErr && <p style={{ fontSize: 13, color: '#E11D48' }}>{settleErr}</p>}

              {/* UPI Pay button */}
              {(() => {
                const payeeUpi = isMultiMember
                  ? otherMembers.find((m) => m.userId === settleForm.toUserId)?.user?.upiId
                  : other?.upiId;
                const payeeName = isMultiMember
                  ? (otherMembers.find((m) => m.userId === settleForm.toUserId)?.user?.name || '')
                  : (other?.name || '');
                const amt = parseFloat(settleForm.amount);
                if (!payeeUpi || !amt || amt <= 0) return null;
                const upiUrl = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(payeeName)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('HisabKitab settlement')}`;
                return (
                  <a
                    href={upiUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px 16px',
                      borderRadius: 14,
                      border: '2px solid #34D399',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>⚡</span> Pay ₹{amt.toFixed(2)} via UPI
                  </a>
                );
              })()}

              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowSettle(false)}
                  style={{ flex: 1, padding: '13px 16px', borderRadius: 14, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addSettlement.isPending}
                  style={{
                    flex: 1,
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                    opacity: addSettlement.isPending ? 0.6 : 1,
                  }}
                >
                  {addSettlement.isPending ? t('common.saving') : t('tabs.record_payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete tab confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>{t('tabs.delete_tab')}</h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{t('tabs.delete_tab_confirm')}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteTab}
                disabled={deleteTab.isPending}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: '#E11D48', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: deleteTab.isPending ? 0.6 : 1 }}
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

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'block',
};

const inputStyle = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid #E5E7EB',
  background: '#F9FAFB',
  color: '#0A0D14',
  padding: '12px 16px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};
