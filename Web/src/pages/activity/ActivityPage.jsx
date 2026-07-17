import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import api from '../../lib/api';

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getGroup(date) {
  const now = new Date();
  const d = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekAgo) return 'This Week';
  return 'Earlier';
}

// Icon box colors keyed by action type
const TYPE_ICON_STYLE = {
  expense_added:        { background: '#E6FAF9', color: '#00C2B2' },   // teal
  group_expense_added:  { background: '#E6FAF9', color: '#00C2B2' },
  split_settled:        { background: '#FEF3C7', color: '#D97706' },   // amber
  split_waived:         { background: '#FEF3C7', color: '#D97706' },
  group_settlement:     { background: '#FEF3C7', color: '#D97706' },
  expense_deleted:      { background: '#FFF1F3', color: '#E11D48' },   // red
  group_member_joined:  { background: '#F5F3FF', color: '#7C3AED' },   // purple
  login:                { background: '#F5F3FF', color: '#7C3AED' },
};

function iconStyle(type) {
  return TYPE_ICON_STYLE[type] || { background: '#F0F2F7', color: '#374151' };
}

export default function ActivityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get('/activity').then((r) => r.data),
    staleTime: 30_000,
  });

  // Group items by date section
  const grouped = [];
  const seen = new Set();
  for (const item of items) {
    const g = getGroup(item.createdAt);
    if (!seen.has(g)) {
      seen.add(g);
      grouped.push({ type: 'header', label: g });
    }
    grouped.push({ type: 'item', ...item });
  }

  // Map group labels to translation keys
  const groupLabel = (label) => {
    if (label === 'Today') return t('notifications.today');
    if (label === 'Yesterday') return t('notifications.yesterday');
    return label;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.activity')} showBack />

      <div style={{ flex: 1, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 16px' }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 11, background: '#E9ECF0', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, background: '#E9ECF0', borderRadius: 6, width: '70%' }} />
                  <div style={{ height: 10, background: '#F0F2F7', borderRadius: 6, width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 96, padding: '96px 32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 4 }}>No activity yet</p>
            <p style={{ fontSize: 13, color: '#B0B8C4', lineHeight: 1.5 }}>
              Add expenses, settle splits, or create groups to see your timeline here.
            </p>
          </div>
        )}

        {/* Activity list */}
        {!isLoading && grouped.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
            {grouped.map((row, idx) => {
              if (row.type === 'header') {
                return (
                  <p
                    key={`h-${idx}`}
                    style={{
                      fontSize: 11, fontWeight: 800, color: '#B0B8C4',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      paddingTop: idx === 0 ? 16 : 20, paddingBottom: 6, margin: 0,
                    }}
                  >
                    {groupLabel(row.label)}
                  </p>
                );
              }

              const { background: iconBg, color: iconColor } = iconStyle(row.type);

              return (
                <SurfaceCard
                  key={row.id}
                  onClick={() => navigate(row.link)}
                  style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Action icon box */}
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                        background: row.iconBg || iconBg,
                        color: iconColor,
                      }}
                    >
                      {row.icon}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.title}
                      </p>
                      {row.subtitle && (
                        <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p style={{ fontSize: 11, color: '#B0B8C4', flexShrink: 0, marginLeft: 4 }}>
                      {relativeTime(row.createdAt)}
                    </p>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
