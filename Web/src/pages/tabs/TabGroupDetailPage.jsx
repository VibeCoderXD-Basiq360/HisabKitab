import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabGroup, useNewMonth, useDeleteTabGroup, useAcceptTabGroup, useDeclineTabGroup } from '../../hooks/useTabGroups';
import { useAuthStore } from '../../store/authStore';

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Not found</p>
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

  // Cumulative balance across all tabs
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

  function statusLabel(tab) {
    if (tab.status === 'CLOSED') return '🔒 Closed';
    if (tab.status === 'ACTIVE') return '🟢 Active';
    return tab.status;
  }

  function balanceText(tab) {
    const b = tab.balance;
    if (!b) return null;
    if (Math.abs(b.net) < 0.01) return { text: 'Settled', color: 'text-green-600 dark:text-green-400' };
    if (b.net > 0) return { text: `+${fmt(b.net)}`, color: 'text-green-600 dark:text-green-400' };
    return { text: `−${fmt(b.net)}`, color: 'text-red-500 dark:text-red-400' };
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate('/tabs')} className="text-gray-500 dark:text-gray-400">
            ← {t('common.back')}
          </button>
          {isCreator && (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm">
              {t('common.delete')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-2xl">🗂️</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">with {other?.name || other?.email}</p>
          </div>
        </div>
      </div>

      {/* Pending invite banner */}
      {isPending && (
        <div className="mx-4 mt-4 rounded-2xl p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          {isMember ? (
            <>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm mb-1">
                🗂️ {other?.name || other?.email} invited you to "{group.name}"
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-3">
                Accept to start tracking monthly household expenses together.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => declineGroup.mutate(id, { onSuccess: () => navigate('/tabs') })}
                  disabled={declineGroup.isPending}
                  className="flex-1 py-2 rounded-xl border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 text-sm font-semibold"
                >
                  Decline
                </button>
                <button
                  onClick={() => acceptGroup.mutate(id)}
                  disabled={acceptGroup.isPending}
                  className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold"
                >
                  ✓ Accept
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⏳ Waiting for {other?.name || other?.email} to accept…
            </p>
          )}
        </div>
      )}

      {group.status === 'ACTIVE' && (
        <>
          {/* Cumulative balance summary */}
          {group.tabs.length > 0 && (
            <div className={`mx-4 mt-4 rounded-2xl p-4 text-center ${
              Math.abs(cumulativeNet) < 0.01
                ? 'bg-green-50 dark:bg-green-900/20'
                : cumulativeNet > 0
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall balance across all months</p>
              {Math.abs(cumulativeNet) < 0.01 ? (
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">✓ All settled</p>
              ) : cumulativeNet > 0 ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{other?.name} owes you</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(cumulativeNet)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">You owe {other?.name}</p>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-400">{fmt(cumulativeNet)}</p>
                </>
              )}
            </div>
          )}

          {/* Current month */}
          <div className="mx-4 mt-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
              Current Month
            </p>
            {activeTab ? (
              <button
                onClick={() => navigate(`/tabs/${activeTab.id}`)}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-lg shrink-0">
                  📅
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{activeTab.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">🟢 Active · {activeTab.entries?.length || 0} entries</p>
                </div>
                <div className="text-right shrink-0">
                  {(() => { const b = balanceText(activeTab); return b ? <p className={`text-sm font-bold ${b.color}`}>{b.text}</p> : null; })()}
                  <p className="text-gray-300 dark:text-gray-600 text-lg">›</p>
                </div>
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No active month tab yet.</p>
              </div>
            )}

            {/* New month button */}
            <button
              onClick={handleNewMonth}
              disabled={newMonth.isPending}
              className="mt-3 w-full py-3 rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 text-sm font-semibold flex items-center justify-center gap-2 active:opacity-60 disabled:opacity-50"
            >
              {newMonth.isPending ? 'Creating…' : '+ Start New Month'}
            </button>
            {newMonthErr && <p className="text-xs text-red-500 mt-1 text-center">{newMonthErr}</p>}
          </div>

          {/* Past months */}
          {closedTabs.length > 0 && (
            <div className="mx-4 mt-5">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                Past Months ({closedTabs.length})
              </p>
              <div className="space-y-2">
                {closedTabs.map((tab) => {
                  const b = balanceText(tab);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate(`/tabs/${tab.id}`)}
                      className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-left flex items-center gap-4 opacity-80"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
                        🔒
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">{tab.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tab.entries?.length || 0} entries</p>
                      </div>
                      <div className="text-right shrink-0">
                        {b && <p className={`text-sm font-bold ${b.color}`}>{b.text}</p>}
                        <p className="text-gray-300 dark:text-gray-600 text-lg">›</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Delete "{group.name}"?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will delete all monthly tabs, entries, and settlements inside this group.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroup.isPending}
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
