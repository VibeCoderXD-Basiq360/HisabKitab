import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import { useGroups } from '../../hooks/useGroups';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const TYPE_ICON = { TRIP: '✈️', HOME: '🏠', WORK: '💼', COUPLE: '💑', OTHER: '👥' };

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MemberAvatars({ members }) {
  const visible = members.slice(0, 4);
  const overflow = members.length - visible.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((m, i) => (
        <div
          key={m.id || i}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00C2B2 0%, #0097A7 100%)',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            marginLeft: i === 0 ? 0 : -8,
          }}
        >
          {initials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#E8EAF0',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#B0B8C4',
            flexShrink: 0,
            marginLeft: -8,
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

function NetBalanceBadge({ net }) {
  const { t } = useTranslation();
  if (net === undefined || net === null) return null;
  const n = Number(net);
  if (n > 0)
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: '#00C2B2' }}>
        {t('groups.owed', { amount: fmt(n) })}
      </span>
    );
  if (n < 0)
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: '#F43F5E' }}>
        {t('groups.owe', { amount: fmt(Math.abs(n)) })}
      </span>
    );
  return <span style={{ fontSize: 13, color: '#B0B8C4' }}>{t('groups.settled')}</span>;
}

function GroupCard({ group, onClick }) {
  const { t } = useTranslation();
  const typeKey = group.type?.toLowerCase();
  const typeLabel = (typeKey && t(`groups.${typeKey}`, { defaultValue: '' })) || t('groups.other');
  const memberCount = group.members?.length || 0;

  return (
    <SurfaceCard onClick={onClick} style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: '#F0FDF9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {group.icon || TYPE_ICON[group.type] || '👥'}
          </div>
          <div>
            <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 15, lineHeight: '1.2', marginBottom: 4 }}>
              {group.name}
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: '#F3F4F6',
                borderRadius: 999,
                fontSize: 11,
                color: '#B0B8C4',
                fontWeight: 600,
              }}
            >
              {TYPE_ICON[group.type]} {typeLabel}
            </span>
          </div>
        </div>
        <span style={{ color: '#D1D5DB', fontSize: 18, marginTop: 4, flexShrink: 0 }}>›</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MemberAvatars members={group.members || []} />
          <span style={{ fontSize: 12, color: '#B0B8C4' }}>
            {memberCount !== 1
              ? t('groups.member_other', { n: memberCount })
              : t('groups.member_one', { n: 1 })}
          </span>
        </div>
        <NetBalanceBadge net={group.myNet} />
      </div>
    </SurfaceCard>
  );
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: groups = [], isLoading } = useGroups();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('groups.title')}
        showBack
        action={
          <button
            onClick={() => navigate('/groups/new')}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#00C2B2',
              padding: '6px 12px',
              borderRadius: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('groups.new')}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '4px solid #00C2B2',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        ) : groups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 256,
              gap: 12,
              padding: '0 32px',
            }}
          >
            <span style={{ fontSize: 48 }}>👥</span>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0A0D14', textAlign: 'center' }}>
              {t('groups.no_groups')}
            </p>
            <p style={{ fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>
              {t('groups.no_groups_desc')}
            </p>
            <button
              onClick={() => navigate('/groups/new')}
              style={{
                marginTop: 8,
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #00C2B2 0%, #0097A7 100%)',
                color: '#fff',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t('groups.create')}
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/groups/new')}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 'calc(84px + env(safe-area-inset-bottom))',
          width: 54,
          height: 54,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #00C2B2 0%, #0097A7 100%)',
          boxShadow: '0 4px 20px rgba(0,194,178,0.5)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          color: '#fff',
          cursor: 'pointer',
          zIndex: 40,
        }}
        aria-label={t('groups.create')}
      >
        +
      </button>
    </div>
  );
}
