import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useBudgets } from '../../hooks/useBudgets';

function progressColor(pct) {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-yellow-400';
  return 'bg-green-500';
}

function progressBg(pct) {
  if (pct >= 100) return 'bg-red-100';
  if (pct >= 80) return 'bg-yellow-100';
  return 'bg-green-100';
}

export default function BudgetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useBudgets();

  const withBudget = items.filter((i) => i.budget);
  const withoutBudget = items.filter((i) => !i.budget);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('budgets.title')} showBack />

      <div className="flex-1 p-4 pb-28 flex flex-col gap-4">
        {isLoading && <p className="text-center text-sm text-gray-400 mt-12">{t('common.loading')}</p>}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <span className="text-5xl">💰</span>
            <p className="text-sm text-gray-500 font-medium">{t('budgets.no_categories')}</p>
            <p className="text-xs text-gray-400 text-center">
              {t('budgets.no_categories_desc')}
            </p>
          </div>
        )}

        {withBudget.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">{t('budgets.active')}</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {withBudget.map((item) => (
                <button
                  key={item.categoryId}
                  onClick={() => navigate(`/settings/budgets/${item.categoryId}`)}
                  className="w-full px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: item.category.color ? `${item.category.color}25` : '#f3f4f6' }}
                    >
                      {item.category.icon || '🏷️'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.category.name}</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          ₹{item.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          <span className="font-normal text-gray-400">
                            {' / '}₹{item.budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </p>
                      </div>
                      <div className={`w-full h-2 rounded-full ${progressBg(item.percentage)}`}>
                        <div
                          className={`h-2 rounded-full transition-all ${progressColor(item.percentage)}`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {item.percentage >= 100
                          ? t('budgets.over_budget', { amount: (item.spent - item.budget.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 }) })
                          : item.percentage >= 80
                          ? t('budgets.nearing', { pct: item.percentage })
                          : t('budgets.used', { pct: item.percentage })}
                      </p>
                    </div>

                    <span className="text-gray-300 text-lg ml-2">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {withoutBudget.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">{t('budgets.no_limit')}</p>
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {withoutBudget.map((item) => (
                <button
                  key={item.categoryId}
                  onClick={() => navigate(`/settings/budgets/${item.categoryId}`)}
                  className="w-full px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: item.category.color ? `${item.category.color}25` : '#f3f4f6' }}
                    >
                      {item.category.icon || '🏷️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.category.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t('budgets.spent_tap', { spent: item.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 }) })}
                      </p>
                    </div>
                    <span className="text-gray-300 text-lg">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
