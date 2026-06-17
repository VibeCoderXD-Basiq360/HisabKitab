import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useCreateGroup, useSearchUsers } from '../../hooks/useGroups';

const TYPE_OPTIONS = [
  { value: 'TRIP', label: 'Trip', icon: '✈️' },
  { value: 'HOME', label: 'Home', icon: '🏠' },
  { value: 'COUPLE', label: 'Couple', icon: '💑' },
  { value: 'WORK', label: 'Work', icon: '💼' },
  { value: 'OTHER', label: 'Other', icon: '👥' },
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

function UserSearchDropdown({ q, onSelect, alreadyAdded }) {
  const { data: results = [], isLoading } = useSearchUsers(q);
  const filtered = results.filter((u) => !alreadyAdded.find((m) => m.userId === u.uid));

  if (q.length < 2) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 z-30 overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 px-4 py-3">No users found</p>
      ) : (
        filtered.map((u) => (
          <button
            key={u.uid}
            onClick={() => onSelect(u)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
          >
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
              {initials(u.displayName || u.email)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{u.displayName || 'User'}</p>
              <p className="text-xs text-gray-400">{u.email}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export default function CreateGroupPage() {
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title={step === 1 ? 'New Group' : 'Add Members'} showBack />

      <div className="flex-1 overflow-auto pb-28">
        {/* Step indicator */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-gray-200'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200'}`} />
        </div>

        {step === 1 && (
          <div className="px-4 pt-4 flex flex-col gap-5">
            {/* Icon picker */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3">Group icon</p>
              <div className="flex gap-3">
                {ICON_OPTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setIcon(em)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                      icon === em
                        ? 'bg-primary-100 ring-2 ring-primary-500 scale-110'
                        : 'bg-white shadow-sm active:bg-gray-50'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Group name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Goa Trip 2025"
                className="w-full bg-white rounded-2xl px-4 py-3 text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary-200 text-base"
              />
            </div>

            {/* Type selector */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-3">Group type</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setType(t.value);
                      if (!ICON_OPTIONS.includes(icon) || icon === '👥') {
                        const iconMap = { TRIP: '✈️', HOME: '🏠', COUPLE: '💑', WORK: '💼', OTHER: '👥' };
                        setIcon(iconMap[t.value]);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      type === t.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 shadow-sm active:bg-gray-50'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => step1Valid && setStep(2)}
              disabled={!step1Valid}
              className="mt-2 w-full py-3.5 bg-primary-600 text-white rounded-2xl font-semibold text-base disabled:opacity-40 active:bg-primary-700"
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="px-4 pt-4 flex flex-col gap-5">
            <p className="text-base font-semibold text-gray-700">
              Add members to{' '}
              <span className="text-primary-600">{name}</span>
            </p>

            {/* Locked creator row */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                  {initials(user?.displayName || user?.email || 'You')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.displayName || 'You'}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                  You
                </span>
              </div>
            </div>

            {/* Search HisabKitab users */}
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Search HisabKitab users</p>
              <div className="relative">
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
                  className="w-full bg-white rounded-2xl px-4 py-3 text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary-200 text-sm"
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
              <p className="text-sm font-semibold text-gray-600 mb-2">Add guest</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                  placeholder="Guest name"
                  className="flex-1 bg-white rounded-2xl px-4 py-3 text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary-200 text-sm"
                />
                <button
                  onClick={handleAddGuest}
                  disabled={!guestName.trim()}
                  className="px-5 py-3 bg-primary-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-40 active:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Pending members list */}
            {members.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                      {m.email && (
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      )}
                      {m.isGuest && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          Guest
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 active:text-red-500 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={createGroup.isPending}
              className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-semibold text-base disabled:opacity-50 active:bg-primary-700 flex items-center justify-center gap-2"
            >
              {createGroup.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
