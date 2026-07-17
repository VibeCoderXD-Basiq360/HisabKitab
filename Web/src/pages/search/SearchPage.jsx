import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import { useSearch } from '../../hooks/useSearch';
import SurfaceCard from '../../components/ui/SurfaceCard';
import TransactionRow from '../../components/ui/TransactionRow';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Icon bg palette for non-expense rows
const ICON_BG = {
  person: '#E0F7FA',
  group: '#EDE7F6',
  tab: '#FFF3E0',
  loan: '#FCE4EC',
};

function Section({ label, children }) {
  return (
    <div>
      <p style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#B0B8C4',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '0 4px',
        marginBottom: 6,
      }}>
        {label}
      </p>
      <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
        {children}
      </SurfaceCard>
    </div>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useSearch(debouncedQ);

  const hasResults =
    data &&
    (data.expenses?.length ||
      data.people?.length ||
      data.groups?.length ||
      data.tabs?.length ||
      data.loans?.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('search.title', 'Search')} showBack />

      {/* Search bar */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#fff',
          borderRadius: 14,
          border: focused ? '1.5px solid #00C2B2' : '1.5px solid #E9ECF0',
          padding: '12px 16px',
          transition: 'border-color 0.15s',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7.5" stroke="#B0B8C4" strokeWidth="1.8" />
            <path d="M17 17l3 3" stroke="#B0B8C4" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('search.placeholder', 'Expenses, people, groups…')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#0A0D14',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: '#E9ECF0',
                border: 'none',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#B0B8C4',
                fontSize: 14,
                flexShrink: 0,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Results area */}
      <div style={{
        flex: 1,
        padding: '8px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
      }}>

        {/* Hint state */}
        {debouncedQ.length < 2 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 64,
            gap: 10,
            textAlign: 'center',
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7.5" stroke="#00C2B2" strokeWidth="1.5" strokeOpacity="0.5" />
              <path d="M17 17l3 3" stroke="#00C2B2" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
            </svg>
            <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>
              {t('search.hint', 'Type at least 2 characters')}
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {debouncedQ.length >= 2 && isFetching && !data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {[1, 2, 3].map((i) => (
              <SurfaceCard key={i} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 13,
                    background: '#E9ECF0',
                  }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 12, borderRadius: 6, background: '#E9ECF0', width: '60%' }} />
                    <div style={{ height: 10, borderRadius: 5, background: '#E9ECF0', width: '40%' }} />
                  </div>
                  <div style={{ width: 48, height: 12, borderRadius: 6, background: '#E9ECF0' }} />
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}

        {/* No results */}
        {debouncedQ.length >= 2 && !isFetching && !hasResults && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 56,
            gap: 10,
          }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7.5" stroke="#00C2B2" strokeWidth="1.5" strokeOpacity="0.35" />
              <path d="M17 17l3 3" stroke="#00C2B2" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35" />
              <path d="M8.5 8.5l5 5M13.5 8.5l-5 5" stroke="#B0B8C4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>
              {t('search.no_results', 'No results found')}
            </p>
          </div>
        )}

        {/* Expenses */}
        {data?.expenses?.length > 0 && (
          <Section label={t('search.expenses', 'Expenses')}>
            {data.expenses.map((e, idx) => (
              <TransactionRow
                key={e.id}
                icon={e.category?.icon || '💸'}
                iconBg={e.category?.color ? `${e.category.color}22` : '#F0F2F7'}
                title={e.title}
                subtitle={e.category?.name}
                amount={fmt(e.amount)}
                isIncome={false}
                isLast={idx === data.expenses.length - 1}
                onClick={() => navigate('/expenses')}
              />
            ))}
          </Section>
        )}

        {/* People */}
        {data?.people?.length > 0 && (
          <Section label={t('search.people', 'People')}>
            {data.people.map((p, idx) => (
              <TransactionRow
                key={p.id}
                icon="👤"
                iconBg={ICON_BG.person}
                title={p.name || p.email}
                subtitle={p.email || undefined}
                isLast={idx === data.people.length - 1}
                onClick={() => navigate(`/people/${p.id}`)}
              />
            ))}
          </Section>
        )}

        {/* Groups */}
        {data?.groups?.length > 0 && (
          <Section label={t('search.groups', 'Groups')}>
            {data.groups.map((g, idx) => (
              <TransactionRow
                key={g.id}
                icon={g.icon || '👥'}
                iconBg={ICON_BG.group}
                title={g.name}
                isLast={idx === data.groups.length - 1}
                onClick={() => navigate(`/groups/${g.id}`)}
              />
            ))}
          </Section>
        )}

        {/* Shared Tabs */}
        {data?.tabs?.length > 0 && (
          <Section label={t('search.tabs', 'Shared Tabs')}>
            {data.tabs.map((tab, idx) => (
              <TransactionRow
                key={tab.id}
                icon="🗂️"
                iconBg={ICON_BG.tab}
                title={tab.name}
                subtitle={tab.status}
                isLast={idx === data.tabs.length - 1}
                onClick={() => navigate(`/tabs/${tab.id}`)}
              />
            ))}
          </Section>
        )}

        {/* Loans */}
        {data?.loans?.length > 0 && (
          <Section label={t('search.loans', 'Loans')}>
            {data.loans.map((l, idx) => (
              <TransactionRow
                key={l.id}
                icon="🏦"
                iconBg={ICON_BG.loan}
                title={l.title}
                subtitle={l.status}
                amount={fmt(l.amount)}
                isIncome={false}
                isLast={idx === data.loans.length - 1}
                onClick={() => navigate('/loans')}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
