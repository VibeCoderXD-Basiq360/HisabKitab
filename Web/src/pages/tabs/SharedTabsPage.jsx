import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSharedTabs, useCreateTab, useAcceptTab, useDeclineTab, useDeleteTab } from '../../hooks/useSharedTabs';
import { useTabGroups, useCreateTabGroup, useAcceptTabGroup, useDeclineTabGroup } from '../../hooks/useTabGroups';
import { usePeople } from '../../hooks/usePeople';
import { useAuthStore } from '../../store/authStore';
import BottomNav from '../../components/BottomNav';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(n));

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
          className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => { setSelected(null); setQuery(''); onChange(''); }}
          >
            ✕
          </button>
        )}
      </div>
      {selected && (
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 pl-1">✓ {selected.email}</p>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => pick(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-300 shrink-0">
                {p.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{p.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 0 && suggestions.length === 0 && !query.includes('@') && (
        <p className="text-xs text-gray-400 mt-1 pl-1">{t('tabs.no_match_hint')}</p>
      )}
    </div>
  );
}

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('tabs.title')}</h1>
        <button
          onClick={() => setShowCreate('picker')}
          className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold shadow"
        >
          +
        </button>
      </div>

      <div className="p-4 space-y-5">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4">🤝</span>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">{t('tabs.empty_title')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('tabs.empty_sub')}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold"
            >
              {t('tabs.create')}
            </button>
          </div>
        )}

        {/* Group invites received */}
        {groupInvites.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              🗂️ Group Invites
            </p>
            <div className="space-y-2">
              {groupInvites.map((g) => (
                <div key={g.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xl shrink-0">🗂️</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 truncate">from {g.creator?.name || g.creator?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => declineGroup.mutate(g.id)}
                      disabled={declineGroup.isPending}
                      className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => acceptGroup.mutate(g.id, { onSuccess: (d) => navigate(`/tab-groups/${d.id}`) })}
                      disabled={acceptGroup.isPending}
                      className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold"
                    >
                      ✓ Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active groups */}
        {activeGroups.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              Monthly Groups
            </p>
            <div className="space-y-2">
              {activeGroups.map((g) => {
                const other = g.creatorId === userId ? g.member : g.creator;
                const net = g.tabs.reduce((sum, t) => sum + (t.balance?.net || 0), 0);
                const activeMonth = g.tabs.find((t) => t.status === 'ACTIVE');
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/tab-groups/${g.id}`)}
                    className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-left flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xl shrink-0">🗂️</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        with {other?.name || other?.email}
                        {activeMonth ? ` · ${activeMonth.name}` : ''}
                        {g.tabs.length > 1 ? ` · ${g.tabs.length} months` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {Math.abs(net) < 0.01 ? (
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">Settled</span>
                      ) : net > 0 ? (
                        <p className="font-bold text-green-600 dark:text-green-400">{fmt(net)}</p>
                      ) : (
                        <p className="font-bold text-red-500 dark:text-red-400">{fmt(net)}</p>
                      )}
                      <p className="text-gray-300 dark:text-gray-600 text-lg">›</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending group invites sent */}
        {groupPending.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              Group Invites Sent
            </p>
            <div className="space-y-2">
              {groupPending.map((g) => (
                <div key={g.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 opacity-70">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl shrink-0">🗂️</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">⏳ Waiting for {g.member?.name || g.member?.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Received invites (standalone tabs) */}
        {receivedInvites.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              {t('tabs.invites_received')}
            </p>
            <div className="space-y-2">
              {receivedInvites.map((tab) => (
                <div key={tab.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-lg font-bold text-primary-600 dark:text-primary-300 shrink-0">
                      {(tab.creator?.name || tab.creator?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{tab.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {t('tabs.invited_by')} {tab.creator?.name || tab.creator?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => declineTab.mutate(tab.id)}
                      disabled={declineTab.isPending}
                      className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
                    >
                      {t('tabs.decline')}
                    </button>
                    <button
                      onClick={() => acceptTab.mutate(tab.id)}
                      disabled={acceptTab.isPending}
                      className="flex-1 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold"
                    >
                      ✓ {t('tabs.accept')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active tabs */}
        {activeTabs.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              {t('tabs.active')}
            </p>
            <div className="space-y-2">
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
                  <button
                    key={tab.id}
                    onClick={() => navigate(`/tabs/${tab.id}`)}
                    className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-left flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xl font-bold text-primary-600 dark:text-primary-300 shrink-0">
                      {isMultiMember ? '👥' : (other?.name || other?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{tab.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {isMultiMember
                          ? `${tab.members.length} members · ${memberNames}`
                          : `${t('tabs.with')} ${other?.name || other?.email}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {isSettled ? (
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{t('common.all_settled')}</span>
                      ) : totalOwed > 0.01 ? (
                        <>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t('tabs.they_owe')}</p>
                          <p className="font-bold text-green-600 dark:text-green-400">{fmt(totalOwed)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t('tabs.you_owe')}</p>
                          <p className="font-bold text-red-500 dark:text-red-400">{fmt(totalOwe)}</p>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Sent invites — waiting */}
        {sentInvites.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              {t('tabs.invites_sent')}
            </p>
            <div className="space-y-2">
              {sentInvites.map((tab) => (
                <div key={tab.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 opacity-80">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-500 shrink-0">
                    {(tab.member?.name || tab.member?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{tab.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      ⏳ {t('tabs.waiting_for')} {tab.member?.name || tab.member?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTab.mutate(tab.id)}
                    className="text-xs text-red-400 shrink-0"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Declined */}
        {declinedTabs.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
              {t('tabs.declined')}
            </p>
            <div className="space-y-2">
              {declinedTabs.map((tab) => (
                <div key={tab.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-lg font-bold text-red-400 shrink-0">
                    {(tab.member?.name || tab.member?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{tab.name}</p>
                    <p className="text-xs text-red-400 truncate">
                      ✗ {tab.member?.name || tab.member?.email} {t('tabs.declined_it')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTab.mutate(tab.id)}
                    className="text-xs text-gray-400 shrink-0"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create picker */}
      {showCreate === 'picker' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate('none')} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">What do you want to create?</h2>
            <button
              onClick={() => { setErr(''); setForm({ name: '', memberEmail: '' }); setShowCreate('group'); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20 text-left"
            >
              <span className="text-3xl">🗂️</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Monthly Group</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Like "Ghar Kharch" — tracks month by month, stores history</p>
              </div>
            </button>
            <button
              onClick={() => { setErr(''); setForm({ name: '', memberEmail: '' }); setShowCreate('tab'); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-left"
            >
              <span className="text-3xl">🤝</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Single Tab</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">One-off shared list — trip, event, project</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Create Group sheet */}
      {showCreate === 'group' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate('none')} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">🗂️ Create Monthly Group</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Give it a name like "Ghar Kharch" or "Flat 4B Expenses". Each month gets its own tab automatically.</p>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Group Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Ghar Kharch, Flat 4B Expenses"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tabs.member_email')}</label>
                <PeoplePicker value={form.memberEmail} onChange={(email) => setForm((f) => ({ ...f, memberEmail: email }))} people={people} />
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate('none')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm">{t('common.cancel')}</button>
                <button type="submit" disabled={createGroup.isPending} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm disabled:opacity-60">
                  {createGroup.isPending ? t('common.saving') : t('tabs.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tab sheet */}
      {showCreate === 'tab' && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCreate('none'); resetTabForm(); }} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('tabs.create')}</h2>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTabType('2person')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  tabType === '2person'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                }`}
              >
                🤝 Just 2 people
              </button>
              <button
                type="button"
                onClick={() => setTabType('multi')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  tabType === 'multi'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                }`}
              >
                👥 Group (3+)
              </button>
            </div>

            <form onSubmit={handleCreateTab} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tabs.tab_name')}</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={t('tabs.tab_name_placeholder')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {tabType === '2person' ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('tabs.member_email')}</label>
                  <PeoplePicker value={form.memberEmail} onChange={(email) => setForm((f) => ({ ...f, memberEmail: email }))} people={people} />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Members ({memberEmails.length} added)
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-2">
                    All members get equal split. Tab is active immediately — no invite needed.
                  </p>
                  {/* Added emails */}
                  {memberEmails.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {memberEmails.map((e) => (
                        <div key={e} className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl px-3 py-2">
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{e}</span>
                          <button type="button" onClick={() => removeEmail(e)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Email input + add button */}
                  <div className="flex gap-2">
                    <PeoplePicker
                      value={emailInput}
                      onChange={setEmailInput}
                      people={people.filter((p) => !memberEmails.includes(p.email))}
                    />
                    <button
                      type="button"
                      onClick={addEmail}
                      className="shrink-0 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold self-start mt-1"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate('none'); resetTabForm(); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={createTab.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60">
                  {createTab.isPending ? t('common.saving') : tabType === 'multi' ? 'Create Group Tab' : t('tabs.send_invite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
