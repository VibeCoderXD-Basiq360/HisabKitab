import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useSearch } from '../../hooks/useSearch';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Section({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-1">{label}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">{children}</div>
    </div>
  );
}

function Row({ icon, title, sub, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-gray-50 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 text-left"
    >
      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
      {right && <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{right}</span>}
    </button>
  );
}

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('search.title', 'Search')} showBack />

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder', 'Expenses, people, groups…')}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 text-lg leading-none">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col gap-4 overflow-y-auto pb-8">
        {debouncedQ.length < 2 && (
          <div className="flex flex-col items-center justify-center mt-20 gap-2 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-sm text-gray-400">{t('search.hint', 'Type at least 2 characters')}</p>
          </div>
        )}

        {debouncedQ.length >= 2 && isFetching && !data && (
          <div className="flex justify-center mt-16">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {debouncedQ.length >= 2 && !isFetching && !hasResults && (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <span className="text-5xl">😶</span>
            <p className="text-sm text-gray-400">{t('search.no_results', 'No results found')}</p>
          </div>
        )}

        {data?.expenses?.length > 0 && (
          <Section label={t('search.expenses', 'Expenses')}>
            {data.expenses.map((e) => (
              <Row
                key={e.id}
                icon={e.category?.icon || '💸'}
                title={e.title}
                sub={e.category?.name}
                right={fmt(e.amount)}
                onClick={() => navigate('/expenses')}
              />
            ))}
          </Section>
        )}

        {data?.people?.length > 0 && (
          <Section label={t('search.people', 'People')}>
            {data.people.map((p) => (
              <Row
                key={p.id}
                icon="👤"
                title={p.name || p.email}
                sub={p.email || undefined}
                onClick={() => navigate(`/people/${p.id}`)}
              />
            ))}
          </Section>
        )}

        {data?.groups?.length > 0 && (
          <Section label={t('search.groups', 'Groups')}>
            {data.groups.map((g) => (
              <Row
                key={g.id}
                icon={g.icon || '👥'}
                title={g.name}
                onClick={() => navigate(`/groups/${g.id}`)}
              />
            ))}
          </Section>
        )}

        {data?.tabs?.length > 0 && (
          <Section label={t('search.tabs', 'Shared Tabs')}>
            {data.tabs.map((tab) => (
              <Row
                key={tab.id}
                icon="🗂️"
                title={tab.name}
                sub={tab.status}
                onClick={() => navigate(`/tabs/${tab.id}`)}
              />
            ))}
          </Section>
        )}

        {data?.loans?.length > 0 && (
          <Section label={t('search.loans', 'Loans')}>
            {data.loans.map((l) => (
              <Row
                key={l.id}
                icon="🏦"
                title={l.title}
                sub={l.status}
                right={fmt(l.amount)}
                onClick={() => navigate('/loans')}
              />
            ))}
          </Section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
