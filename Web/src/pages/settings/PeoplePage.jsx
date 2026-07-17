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
import SurfaceCard from '../../components/ui/SurfaceCard';

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

  const inputStyle = {
    background: '#F0F2F7',
    border: 'none',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    color: '#0A0D14',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: '#B0B8C4',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    margin: 0,
    padding: '0 4px 8px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('people.title')} showBack />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 4px' }}>
        <button
          onClick={() => setTab('contacts')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 12,
            border: 'none',
            background: tab === 'contacts' ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#fff',
            color: tab === 'contacts' ? '#fff' : '#B0B8C4',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: tab === 'contacts' ? '0 2px 8px rgba(0,194,178,0.18)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {t('people.tab_contacts')}
        </button>
        <button
          onClick={() => setTab('requests')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 12,
            border: 'none',
            background: tab === 'requests' ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#fff',
            color: tab === 'requests' ? '#fff' : '#B0B8C4',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: tab === 'requests' ? '0 2px 8px rgba(0,194,178,0.18)' : 'none',
            transition: 'all 0.2s',
            position: 'relative',
          }}
        >
          {t('people.tab_requests')}
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#FF4D4F',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* ── CONTACTS TAB ── */}
        {tab === 'contacts' && (
          <>
            {/* Add/edit form */}
            <SurfaceCard style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={sectionLabelStyle}>
                {editId ? t('people.edit_person') : t('people.add_manually')}
              </p>
              <input
                style={inputStyle}
                placeholder={editId ? t('people.edit_name') : t('people.name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <input
                style={inputStyle}
                type="email"
                placeholder={t('people.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                {editId && (
                  <button
                    onClick={cancel}
                    style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#B0B8C4', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    {t('common.cancel')}
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: 'none', background: name.trim() ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#E9ECF0', color: name.trim() ? '#fff' : '#B0B8C4', fontWeight: 800, fontSize: 14, cursor: name.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}
                >
                  {editId ? t('people.save_changes') : t('people.add_person')}
                </button>
              </div>
            </SurfaceCard>

            {/* Connected contacts */}
            {linked.length > 0 && (
              <div>
                <p style={sectionLabelStyle}>{t('people.connected')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {linked.map((p) => (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00C2B2,#009E90)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0A0D14', fontSize: 15 }}>{p.name}</p>
                        {p.email && <p style={{ margin: 0, fontSize: 12, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>}
                        <p style={{ margin: 0, fontSize: 12, color: '#00C2B2', fontWeight: 600 }}>● {t('people.linked')}</p>
                      </div>
                      <button onClick={() => remove.mutate(p.id)} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#FF4D4F', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
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
                  <p style={sectionLabelStyle}>{t('people.manual')}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {manual.map((p) => (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00C2B2,#009E90)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0A0D14', fontSize: 15 }}>{p.name}</p>
                        {p.email && <p style={{ margin: 0, fontSize: 12, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</p>}
                      </div>
                      <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#B0B8C4', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                        {t('common.edit')}
                      </button>
                      <button onClick={() => remove.mutate(p.id)} style={{ background: 'none', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#FF4D4F', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                        {t('common.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '16px 0', margin: 0 }}>{t('common.loading')}</p>}
            {!isLoading && people.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '16px 0', margin: 0 }}>{t('people.no_people')}</p>
            )}
          </>
        )}

        {/* ── REQUESTS TAB ── */}
        {tab === 'requests' && (
          <>
            {/* Send invite */}
            <SurfaceCard style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={sectionLabelStyle}>{t('people.send_invite')}</p>
              <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  type="email"
                  placeholder={t('people.invite_placeholder')}
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteErr(''); setInviteResult(null); }}
                  required
                />
                <button
                  type="submit"
                  disabled={sendRequest.isPending || !inviteEmail.trim()}
                  style={{
                    padding: '11px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: inviteEmail.trim() && !sendRequest.isPending ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#E9ECF0',
                    color: inviteEmail.trim() && !sendRequest.isPending ? '#fff' : '#B0B8C4',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: inviteEmail.trim() && !sendRequest.isPending ? 'pointer' : 'default',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {sendRequest.isPending ? '…' : t('people.send')}
                </button>
              </form>
              {inviteErr && <p style={{ margin: 0, fontSize: 12, color: '#FF4D4F' }}>{inviteErr}</p>}
              {inviteResult && (
                <p style={{ margin: 0, fontSize: 12, color: '#00C2B2', fontWeight: 600 }}>
                  {inviteResult.userExists
                    ? t('people.request_sent_user', { email: inviteResult.email })
                    : t('people.request_sent_invite', { email: inviteResult.email })}
                </p>
              )}
            </SurfaceCard>

            {/* Received requests */}
            {requests.received?.length > 0 && (
              <div>
                <p style={sectionLabelStyle}>{t('people.received')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {requests.received.map((r) => (
                    <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00C2B2,#009E90)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(r.sender?.name || r.sender?.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0A0D14', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.sender?.name || r.sender?.email}
                        </p>
                        {r.sender?.name && (
                          <p style={{ margin: 0, fontSize: 12, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sender?.email}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => reject.mutate(r.id)}
                          disabled={reject.isPending}
                          style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid #E9ECF0', background: '#fff', color: '#B0B8C4', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {t('people.reject')}
                        </button>
                        <button
                          onClick={() => accept.mutate(r.id)}
                          disabled={accept.isPending}
                          style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
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
                <p style={sectionLabelStyle}>{t('people.sent')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {requests.sent.map((r) => (
                    <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.82 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#B0B8C4', flexShrink: 0 }}>
                        {(r.recipientEmail || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0A0D14', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.recipient?.name || r.recipientEmail}
                        </p>
                        {r.recipient?.name && (
                          <p style={{ margin: 0, fontSize: 12, color: '#B0B8C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recipientEmail}</p>
                        )}
                        <p style={{ margin: 0, fontSize: 12, color: '#F5A623', fontWeight: 600 }}>⏳ {t('people.pending')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requests.received?.length === 0 && requests.sent?.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 40, marginBottom: 12 }}>📬</span>
                <p style={{ margin: 0, fontSize: 14, color: '#B0B8C4' }}>{t('people.no_requests')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
