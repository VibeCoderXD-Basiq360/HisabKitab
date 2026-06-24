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

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Math.abs(n));

const today = () => new Date().toISOString().split('T')[0];

const SPLIT_TYPES = ['THEIRS_ONLY', 'SPLIT'];

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Not found</p>
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

  // For 2-person balance display
  const isSettled2 = !isMultiMember && Math.abs(balance.net) < 0.01;
  // For multi-member balance display
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

  const splitTypeColor = (type) => {
    if (type === 'MINE_ONLY') return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
    if (type === 'THEIRS_ONLY') return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => tab.groupId ? navigate(`/tab-groups/${tab.groupId}`) : navigate('/tabs')}
            className="text-gray-500 dark:text-gray-400"
          >
            ← {t('common.back')}
          </button>
          {isCreator && (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm">
              {t('common.delete')}
            </button>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{tab.name}</h1>
        {isMultiMember ? (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-semibold">
              👥 {(tab.members || []).length} members
            </span>
            {(tab.members || []).map((m) => (
              <span key={m.id} className="text-xs text-gray-400 dark:text-gray-500">
                {m.userId === user?.id ? 'You' : m.name || m.user?.name || m.user?.email}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('tabs.with')} {other?.name || other?.email}
          </p>
        )}
      </div>

      {/* Pending banner — 2-person only */}
      {isPending && !isMultiMember && (
        <div className="mx-4 mt-4 rounded-2xl p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          {isMember ? (
            <>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm mb-1">
                🤝 {t('tabs.invite_pending_member', { name: other?.name || other?.email })}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">{t('tabs.invite_pending_member_sub')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => declineTab.mutate(id, { onSuccess: () => navigate('/tabs') })}
                  disabled={declineTab.isPending}
                  className="flex-1 py-2 rounded-xl border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 text-sm font-semibold"
                >
                  {t('tabs.decline')}
                </button>
                <button
                  onClick={() => acceptTab.mutate(id)}
                  disabled={acceptTab.isPending}
                  className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold"
                >
                  ✓ {t('tabs.accept')}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⏳ {t('tabs.invite_pending_creator', { name: other?.name || other?.email })}
            </p>
          )}
        </div>
      )}

      {/* Closed month banner */}
      {tab.status === 'CLOSED' && (
        <div className="mx-4 mt-4 rounded-2xl p-3 bg-gray-100 dark:bg-gray-700 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">This month is closed</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entries and settlements are locked. View only.</p>
          </div>
          {tab.groupId && (
            <button onClick={() => navigate(`/tab-groups/${tab.groupId}`)} className="text-xs font-semibold text-teal-600 dark:text-teal-400 shrink-0">
              Group →
            </button>
          )}
        </div>
      )}

      {/* Balance card */}
      {!isPending && (
        <div className="mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
          {isMultiMember ? (
            /* Multi-member balance */
            <div className="bg-white dark:bg-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Balances</p>
              {isSettledMulti ? (
                <p className="text-center text-green-600 dark:text-green-400 font-bold text-lg py-2">✓ {t('common.all_settled')}</p>
              ) : (
                <div className="space-y-2">
                  {(balance.members || []).map((m) => (
                    <div key={m.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-300 shrink-0">
                          {(m.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{m.name}</span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ml-2 ${m.net > 0.01 ? 'text-green-600 dark:text-green-400' : m.net < -0.01 ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`}>
                        {m.net > 0.01 ? `+${fmt(m.net)}` : m.net < -0.01 ? `-${fmt(m.net)}` : 'Settled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow"
                >
                  + {t('tabs.add_entry')}
                </button>
                {!isSettledMulti && (
                  <button
                    onClick={() => setShowSettle(true)}
                    className="flex-1 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 shadow"
                  >
                    💸 {t('tabs.settle_up')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* 2-person balance */
            <div className={`p-5 text-center ${isSettled2 ? 'bg-green-50 dark:bg-green-900/20' : balance.net > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {isSettled2 ? (
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">✓ {t('common.all_settled')}</p>
              ) : balance.net > 0 ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{other?.name || other?.email} {t('tabs.owes_you')}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{fmt(balance.net)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('tabs.you_owe')} {other?.name || other?.email}</p>
                  <p className="text-3xl font-bold text-red-500 dark:text-red-400">{fmt(balance.net)}</p>
                </>
              )}
              <div className="flex gap-3 mt-4 justify-center">
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow"
                >
                  + {t('tabs.add_entry')}
                </button>
                {!isSettled2 && (
                  <button
                    onClick={() => {
                      setSettleForm((f) => ({ ...f, amount: String(Math.round(balance.youOwe * 100) / 100) }));
                      setShowSettle(true);
                    }}
                    className="px-5 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-600 shadow"
                  >
                    💸 {t('tabs.settle_up')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-2">
        {['entries', 'settlements'].map((t2) => (
          <button
            key={t2}
            onClick={() => setActiveTab(t2)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === t2
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t2 === 'entries' ? t('tabs.entries') : t('tabs.settlements')}
          </button>
        ))}
      </div>

      {/* Entries list */}
      {activeTab === 'entries' && (
        <div className="mx-4 mt-3 space-y-4">
          {tab.entries.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">{t('tabs.no_entries')}</p>
          )}
          {grouped.map(([dateStr, entries]) => (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {dayLabel(dateStr)}
                </p>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {fmt(entries.reduce((s, e) => s + Number(e.amount), 0))}
                </p>
              </div>
              <div className="space-y-2">
                {entries.map((entry) => {
                  const iMadeit = entry.paidById === user?.id;
                  const entryAmt = Number(entry.amount);
                  const memberCount = isMultiMember ? (tab.members || []).filter(m => m.userId).length : 2;
                  const debtAmt = isMultiMember
                    ? entryAmt / memberCount
                    : entry.splitType === 'MINE_ONLY' ? 0
                    : entry.splitType === 'THEIRS_ONLY' ? entryAmt
                    : entryAmt * (entry.splitRatio / 100);

                  return (
                    <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{entry.description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {isMultiMember ? (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                Split equally {memberCount} ways
                              </span>
                            ) : (
                              <>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${splitTypeColor(entry.splitType)}`}>
                                  {splitTypeLabel(entry.splitType)}
                                </span>
                                {entry.splitType === 'SPLIT' && (
                                  <span className="text-xs text-gray-400">{entry.splitRatio}% {t('tabs.theirs')}</span>
                                )}
                              </>
                            )}
                            {entry.category && (
                              <span className="text-xs text-gray-400">{entry.category}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {iMadeit ? t('tabs.paid_by_you') : `${t('tabs.paid_by')} ${entry.paidBy?.name || entry.paidBy?.email}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 dark:text-white">{fmt(entryAmt)}</p>
                          {(!isMultiMember && entry.splitType !== 'MINE_ONLY') || isMultiMember ? (
                            <p className={`text-xs font-medium ${iMadeit ? 'text-green-600' : 'text-red-500'}`}>
                              {iMadeit ? `+${fmt(debtAmt)}` : `-${fmt(debtAmt)}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {entry.note && <p className="text-xs text-gray-400 mt-2 italic">"{entry.note}"</p>}
                      {(iMadeit || isCreator) && (
                        <div className="flex gap-3 mt-2">
                          {iMadeit && (
                            <button onClick={() => openEditEntry(entry)} className="text-xs text-primary-500 hover:text-primary-700">
                              {t('common.edit')}
                            </button>
                          )}
                          <button onClick={() => handleDeleteEntry(entry.id)} className="text-xs text-red-400 hover:text-red-600">
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settlements list */}
      {activeTab === 'settlements' && (
        <div className="mx-4 mt-3 space-y-2">
          {tab.settlements.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">{t('tabs.no_settlements')}</p>
          )}
          {tab.settlements.map((s) => {
            const iMadeIt = s.paidById === user?.id;
            const receiver = s.toUser || (tab.creatorId === s.paidById ? tab.member : tab.creator);
            return (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg">
                  💸
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {iMadeIt
                      ? `${t('tabs.you_paid')} ${receiver?.name || receiver?.email || ''}`
                      : `${s.paidBy?.name || s.paidBy?.email} ${t('tabs.paid')}`}
                  </p>
                  {s.note && <p className="text-xs text-gray-400 italic">"{s.note}"</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 dark:text-green-400">{fmt(Number(s.amount))}</p>
                  {(iMadeIt || isCreator) && (
                    <button
                      onClick={() => deleteSettlement.mutate(s.id)}
                      disabled={deleteSettlement.isPending}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Entry Sheet */}
      {showAddEntry && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddEntry(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingEntry ? `${t('common.edit')} ${t('tabs.entry')}` : t('tabs.add_entry')}
            </h2>
            {isMultiMember && (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">
                Split equally among all {(tab.members || []).filter(m => m.userId).length} members
              </p>
            )}
            <form onSubmit={handleAddEntry} className="space-y-3">
              <Field label={t('tabs.description')}>
                <input
                  className={inputCls}
                  placeholder={t('tabs.description_placeholder')}
                  value={entryForm.description}
                  onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </Field>
              <Field label={t('tabs.amount')}>
                <input
                  className={inputCls}
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
                  className={inputCls}
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t('tabs.split_type')}
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {SPLIT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEntryForm((f) => ({ ...f, splitType: type }))}
                          className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                            entryForm.splitType === type
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {splitTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {entryForm.splitType === 'THEIRS_ONLY' && t('tabs.theirs_only_hint', { name: other?.name || other?.email })}
                      {entryForm.splitType === 'SPLIT' && t('tabs.split_hint')}
                    </p>
                  </div>

                  {entryForm.splitType === 'SPLIT' && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {t('tabs.their_share')}: {entryForm.splitRatio}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={entryForm.splitRatio}
                        onChange={(e) => setEntryForm((f) => ({ ...f, splitRatio: Number(e.target.value) }))}
                        className="w-full mt-2 accent-primary-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{t('tabs.you')}: {100 - entryForm.splitRatio}%</span>
                        <span>{other?.name || t('tabs.them')}: {entryForm.splitRatio}%</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Field label={`${t('tabs.category')} (${t('common.optional')})`}>
                <input
                  className={inputCls}
                  placeholder={t('tabs.category_placeholder')}
                  value={entryForm.category}
                  onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value }))}
                />
              </Field>
              <Field label={`${t('tabs.note')} (${t('common.optional')})`}>
                <input
                  className={inputCls}
                  placeholder={t('tabs.note_placeholder')}
                  value={entryForm.note}
                  onChange={(e) => setEntryForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Field>

              {entryErr && <p className="text-sm text-red-500">{entryErr}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAddEntry(false); setEditingEntry(null); setEntryForm(EMPTY_ENTRY); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addEntry.isPending || updateEntry.isPending}
                  className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60"
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
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">💸 {t('tabs.settle_up')}</h2>
            <form onSubmit={handleSettle} className="space-y-3">

              {/* "Pay to" picker — multi-member only */}
              {isMultiMember && (
                <Field label="Pay to">
                  <select
                    className={inputCls}
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
                  className={inputCls}
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
                  className={inputCls}
                  type="date"
                  value={settleForm.date}
                  onChange={(e) => setSettleForm((f) => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label={`${t('tabs.note')} (${t('common.optional')})`}>
                <input
                  className={inputCls}
                  placeholder={t('tabs.settle_note_placeholder')}
                  value={settleForm.note}
                  onChange={(e) => setSettleForm((f) => ({ ...f, note: e.target.value }))}
                />
              </Field>
              {settleErr && <p className="text-sm text-red-500">{settleErr}</p>}

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
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-green-400 text-green-600 dark:text-green-400 font-semibold text-sm active:scale-[0.98] transition-transform"
                  >
                    <span className="text-lg">⚡</span> Pay ₹{amt.toFixed(2)} via UPI
                  </a>
                );
              })()}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSettle(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={addSettlement.isPending}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-60"
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
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">{t('tabs.delete_tab')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('tabs.delete_tab_confirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteTab}
                disabled={deleteTab.isPending}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
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
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
