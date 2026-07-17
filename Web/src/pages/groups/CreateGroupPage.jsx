import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import { useCreateGroup, useSearchUsers } from '../../hooks/useGroups';

const TYPE_KEYS = {
  TRIP: 'groups.trip',
  HOME: 'groups.home',
  COUPLE: 'groups.couple',
  WORK: 'groups.work',
  OTHER: 'groups.other',
};

const TYPE_OPTIONS = [
  { value: 'TRIP', icon: '✈️' },
  { value: 'HOME', icon: '🏠' },
  { value: 'COUPLE', icon: '💑' },
  { value: 'WORK', icon: '💼' },
  { value: 'OTHER', icon: '👥' },
];

const ICON_OPTIONS = ['✈️', '🏠', '💑', '💼', '🎉', '👥'];

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#F0F2F7',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: '#0A0D14',
  outline: 'none',
};

const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#B0B8C4',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 8,
  display: 'block',
};

function UserSearchDropdown({ q, onSelect, alreadyAdded }) {
  const { data: results = [], isLoading } = useSearchUsers(q);
  const filtered = results.filter((u) => !alreadyAdded.find((m) => m.userId === u.uid));

  if (q.length < 2) return null;

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
      background: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
      border: '1px solid #F0F2F7', zIndex: 30, overflow: 'hidden',
    }}>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid #00C2B2', borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: '#B0B8C4', padding: '12px 16px', margin: 0 }}>No users found</p>
      ) : (
        filtered.map((u) => (
          <button
            key={u.uid}
            onClick={() => onSelect(u)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: '1px solid #F0F2F7',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#E6FAF9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#009E90', flexShrink: 0,
            }}>
              {initials(u.displayName || u.email)}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', margin: 0 }}>
                {u.displayName || 'User'}
              </p>
              <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>{u.email}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export default function CreateGroupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createGroup = useCreateGroup();

  const [step, setStep] = useState(1);
  const [icon, setIcon] = useState('👥');
  const [name, setName] = useState('');
  const [type, setType] = useState('OTHER');

  const [searchQ, setSearchQ] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [members, setMembers] = useState([]);

  const searchRef = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleAddUser(u) {
    setMembers((prev) => [
      ...prev,
      { id: `user-${u.uid}`, userId: u.uid, name: u.displayName || u.email, email: u.email, isUser: true },
    ]);
    setSearchQ('');
    setShowDropdown(false);
  }

  function handleAddGuest() {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    setMembers((prev) => [
      ...prev,
      { id: `guest-${Date.now()}`, userId: null, name: trimmed, isGuest: true },
    ]);
    setGuestName('');
  }

  function handleRemoveMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleCreate() {
    const payload = {
      name: name.trim(),
      type,
      icon,
      members: members.map((m) => ({
        userId: m.userId || null,
        name: m.name,
        isGuest: m.isGuest || false,
      })),
    };
    createGroup.mutate(payload, {
      onSuccess: (data) => {
        navigate(`/groups/${data.id}`);
      },
    });
  }

  const step1Valid = name.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={step === 1 ? 'New Group' : 'Add Members'} showBack />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Step progress bar */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 4px' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: step >= s ? '#00C2B2' : '#E5E7EB',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {step === 1 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Icon picker */}
            <div>
              <span style={sectionLabelStyle}>Group Icon</span>
              <div style={{ display: 'flex', gap: 10 }}>
                {ICON_OPTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setIcon(em)}
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, border: 'none', cursor: 'pointer',
                      background: icon === em ? '#E6FAF9' : '#F0F2F7',
                      outline: icon === em ? '2px solid #00C2B2' : 'none',
                      outlineOffset: 1,
                      transform: icon === em ? 'scale(1.12)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Group name */}
            <div>
              <span style={sectionLabelStyle}>Group Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Goa Trip 2025"
                style={inputStyle}
              />
            </div>

            {/* Group type */}
            <div>
              <span style={sectionLabelStyle}>Group Type</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setType(opt.value);
                        if (!ICON_OPTIONS.includes(icon) || icon === '👥') {
                          const iconMap = { TRIP: '✈️', HOME: '🏠', COUPLE: '💑', WORK: '💼', OTHER: '👥' };
                          setIcon(iconMap[opt.value]);
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 20,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: 'none',
                        background: active ? 'linear-gradient(135deg, #00C2B2, #009E90)' : '#F0F2F7',
                        color: active ? '#fff' : '#374151',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{opt.icon}</span>
                      <span>{t(TYPE_KEYS[opt.value])}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => step1Valid && setStep(2)}
              disabled={!step1Valid}
              style={{
                width: '100%', padding: '15px 0', marginTop: 4,
                background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 800, cursor: step1Valid ? 'pointer' : 'not-allowed',
                opacity: step1Valid ? 1 : 0.4,
              }}
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
              Add members to{' '}
              <span style={{ color: '#00C2B2' }}>{name}</span>
            </p>

            {/* Creator row (locked) */}
            <SurfaceCard style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #00C2B2, #009E90)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {initials(user?.displayName || user?.email || 'You')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
                    {user?.displayName || 'You'}
                  </p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#009E90',
                  background: '#E6FAF9', borderRadius: 20, padding: '3px 10px',
                }}>
                  You
                </span>
              </div>
            </SurfaceCard>

            {/* Search HisabKitab users */}
            <div>
              <span style={sectionLabelStyle}>Search HisabKitab Users</span>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  type="email"
                  value={searchQ}
                  onChange={(e) => {
                    setSearchQ(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by email…"
                  style={inputStyle}
                />
                {showDropdown && (
                  <div ref={dropdownRef}>
                    <UserSearchDropdown
                      q={searchQ}
                      onSelect={handleAddUser}
                      alreadyAdded={members}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Add guest */}
            <div>
              <span style={sectionLabelStyle}>Add Guest (no account)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                  placeholder="Guest name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleAddGuest}
                  disabled={!guestName.trim()}
                  style={{
                    padding: '11px 18px',
                    background: 'linear-gradient(135deg, #00C2B2, #009E90)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: guestName.trim() ? 'pointer' : 'not-allowed',
                    opacity: guestName.trim() ? 1 : 0.4, flexShrink: 0,
                  }}
                >
                  {t('common.add')}
                </button>
              </div>
            </div>

            {/* Added members list */}
            {members.length > 0 && (
              <div>
                <span style={sectionLabelStyle}>Members ({members.length})</span>
                {/* Member chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#E6FAF9', color: '#009E90',
                        borderRadius: 20, padding: '4px 10px 4px 6px',
                        fontSize: 13, fontWeight: 600,
                      }}
                    >
                      {/* Avatar circle */}
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00C2B2, #009E90)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {initials(m.name)}
                      </div>
                      <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </span>
                      {m.isGuest && (
                        <span style={{
                          fontSize: 10, color: '#B0B8C4', background: '#F0F2F7',
                          borderRadius: 10, padding: '1px 6px', marginLeft: 2,
                        }}>
                          Guest
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#009E90', fontSize: 14, lineHeight: 1,
                          padding: 0, marginLeft: 2, display: 'flex', alignItems: 'center',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={createGroup.isPending}
              style={{
                width: '100%', padding: '15px 0',
                background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 800,
                cursor: createGroup.isPending ? 'not-allowed' : 'pointer',
                opacity: createGroup.isPending ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {createGroup.isPending ? (
                <>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  {t('common.loading')}
                </>
              ) : (
                t('groups.create')
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
