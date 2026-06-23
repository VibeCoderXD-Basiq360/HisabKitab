import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from '../../hooks/usePeople';
import {
  useContactRequests,
  useSendContactRequest,
  useAcceptContactRequest,
  useRejectContactRequest,
} from '../../hooks/useContacts';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function PeoplePage() {
  const { t } = useTranslation();
  const { data: people = [], isLoading } = usePeople();
  const { data: requests = { received: [], sent: [] } } = useContactRequests();
  const create = useCreatePerson();
  const update = useUpdatePerson();
  const remove = useDeletePerson();
  const sendRequest = useSendContactRequest();
  const accept = useAcceptContactRequest();
  const reject = useRejectContactRequest();

  const [tab, setTab] = useState('contacts'); // 'contacts' | 'requests'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editId, setEditId] = useState(null);

  // Invite flow
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteResult, setInviteResult] = useState(null); // { userExists, email }
  const [inviteErr, setInviteErr] = useState('');

  const pendingCount = requests.received?.length || 0;

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editId) {
      await update.mutateAsync({ id: editId, name: name.trim(), email: email.trim() || undefined });
      setEditId(null);
    } else {
      await create.mutateAsync({ name: name.trim(), email: email.trim() || undefined });
    }
    setName('');
    setEmail('');
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setName(p.name);
    setEmail(p.email || '');
  };

  const cancel = () => { setEditId(null); setName(''); setEmail(''); };

  async function handleSendRequest(e) {
    e.preventDefault();
    setInviteErr('');
    setInviteResult(null);
    try {
      const result = await sendRequest.mutateAsync(inviteEmail.trim());
      setInviteResult({ userExists: result.userExists, email: inviteEmail.trim() });
      setInviteEmail('');
    } catch (ex) {
      setInviteErr(ex.response?.data?.error || t('common.error'));
    }
  }

  const linked = people.filter((p) => p.linkedUserId);
  const manual = people.filter((p) => !p.linkedUserId);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('people.title')} showBack />

      {/* Tab switcher */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        <button
          onClick={() => setTab('contacts')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'contacts'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {t('people.tab_contacts')}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors relative ${
            tab === 'requests'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {t('people.tab_requests')}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <>
            {/* Add/edit form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {editId ? t('people.edit_person') : t('people.add_manually')}
              </p>
              <Input
                label={editId ? t('people.edit_name') : t('people.name')}
                placeholder={t('people.name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Input
                label={t('people.email_optional')}
                type="email"
                placeholder={t('people.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2">
                {editId && (
                  <Button variant="ghost" onClick={cancel} className="shrink-0">
                    {t('common.cancel')}
                  </Button>
                )}
                <Button onClick={handleSave} disabled={!name.trim()} className="flex-1">
                  {editId ? t('people.save_changes') : t('people.add_person')}
                </Button>
              </div>
            </div>

            {/* Connected contacts */}
            {linked.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                  {t('people.connected')}
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {linked.map((p) => (
                    <div key={p.id} className="flex items-center px-4 py-3 gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                        {p.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        {p.email && <p className="text-xs text-gray-400 truncate">{p.email}</p>}
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">● {t('people.linked')}</p>
                      </div>
                      <button onClick={() => remove.mutate(p.id)} className="text-xs text-red-500 px-2 py-1 shrink-0">
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual contacts */}
            {manual.length > 0 && (
              <div>
                {linked.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                    {t('people.manual')}
                  </p>
                )}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {manual.map((p) => (
                    <div key={p.id} className="flex items-center px-4 py-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                        {p.email && <p className="text-xs text-gray-400 truncate">{p.email}</p>}
                      </div>
                      <button onClick={() => startEdit(p)} className="text-sm text-primary-600 px-2 py-1 shrink-0">
                        {t('common.edit')}
                      </button>
                      <button onClick={() => remove.mutate(p.id)} className="text-sm text-red-500 px-2 py-1 shrink-0">
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && <p className="text-center text-sm text-gray-400 py-4">{t('common.loading')}</p>}
            {!isLoading && people.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">{t('people.no_people')}</p>
            )}
          </>
        )}

        {/* ── REQUESTS TAB ── */}
        {tab === 'requests' && (
          <>
            {/* Send invite */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('people.send_invite')}</p>
              <form onSubmit={handleSendRequest} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  type="email"
                  placeholder={t('people.invite_placeholder')}
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteErr(''); setInviteResult(null); }}
                  required
                />
                <button
                  type="submit"
                  disabled={sendRequest.isPending || !inviteEmail.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60 shrink-0"
                >
                  {sendRequest.isPending ? '…' : t('people.send')}
                </button>
              </form>
              {inviteErr && <p className="text-xs text-red-500">{inviteErr}</p>}
              {inviteResult && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {inviteResult.userExists
                    ? t('people.request_sent_user', { email: inviteResult.email })
                    : t('people.request_sent_invite', { email: inviteResult.email })}
                </p>
              )}
            </div>

            {/* Received requests */}
            {requests.received?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                  {t('people.received')}
                </p>
                <div className="space-y-2">
                  {requests.received.map((r) => (
                    <div key={r.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-300 shrink-0">
                        {(r.sender?.name || r.sender?.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {r.sender?.name || r.sender?.email}
                        </p>
                        {r.sender?.name && (
                          <p className="text-xs text-gray-400 truncate">{r.sender?.email}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => reject.mutate(r.id)}
                          disabled={reject.isPending}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold"
                        >
                          {t('people.reject')}
                        </button>
                        <button
                          onClick={() => accept.mutate(r.id)}
                          disabled={accept.isPending}
                          className="px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-semibold"
                        >
                          ✓ {t('people.accept')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent requests */}
            {requests.sent?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                  {t('people.sent')}
                </p>
                <div className="space-y-2">
                  {requests.sent.map((r) => (
                    <div key={r.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 opacity-80">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                        {(r.recipientEmail || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {r.recipient?.name || r.recipientEmail}
                        </p>
                        {r.recipient?.name && (
                          <p className="text-xs text-gray-400 truncate">{r.recipientEmail}</p>
                        )}
                        <p className="text-xs text-yellow-500">⏳ {t('people.pending')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requests.received?.length === 0 && requests.sent?.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-3">📬</span>
                <p className="text-sm text-gray-400">{t('people.no_requests')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
