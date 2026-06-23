import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useTemplates, useDeleteTemplate, useUpdateTemplate } from '../../hooks/useTemplates';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const updateTemplate = useUpdateTemplate();

  const [editing, setEditing] = useState(null); // { id, title, emoji, amount }
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function handleSaveEdit() {
    await updateTemplate.mutateAsync({
      id: editing.id,
      title: editing.title,
      emoji: editing.emoji || null,
      amount: editing.amount ? Number(editing.amount) : null,
    });
    setEditing(null);
  }

  async function handleDelete(id) {
    await deleteTemplate.mutateAsync(id);
    setConfirmDelete(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Quick-Add Templates" onBack={() => navigate('/settings')} />

      <div className="px-4 pt-4 space-y-3">
        {isLoading && (
          <p className="text-center text-gray-400 py-8 text-sm">Loading…</p>
        )}

        {!isLoading && templates.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">⚡</div>
            <p className="font-medium text-gray-600 dark:text-gray-300">No templates yet</p>
            <p className="text-sm mt-1">When adding an expense, tap "Save as quick-add template" to create one.</p>
          </div>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl w-8 text-center">{t.emoji || '⚡'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{t.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.amount ? `₹${Number(t.amount).toLocaleString('en-IN')}` : 'No amount'}
                {t.category ? ` · ${t.category.icon} ${t.category.name}` : ''}
                {t.usageCount > 0 ? ` · used ${t.usageCount}×` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing({ id: t.id, title: t.title, emoji: t.emoji || '', amount: t.amount ? String(t.amount) : '' })}
                className="p-2 text-gray-400 hover:text-primary-500 transition-colors"
              >
                ✏️
              </button>
              <button
                onClick={() => setConfirmDelete(t.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Edit Template</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={editing.title}
                  onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Emoji</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={editing.emoji}
                  onChange={(e) => setEditing((p) => ({ ...p, emoji: e.target.value }))}
                  maxLength={4}
                  placeholder="e.g. ⛽"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Default Amount</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={editing.amount}
                  onChange={(e) => setEditing((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="Leave blank for no default"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editing.title || updateTemplate.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {updateTemplate.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Delete Template?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteTemplate.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleteTemplate.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
