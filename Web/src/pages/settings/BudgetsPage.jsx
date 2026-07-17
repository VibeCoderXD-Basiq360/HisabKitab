import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import { useBudgets } from '../../hooks/useBudgets';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';

function pctColor(pct) {
  if (pct >= 100) return '#E11D48';
  if (pct >= 80) return '#F59E0B';
  return '#00C2B2';
}

function pctBadgeVariant(pct) {
  if (pct >= 100) return 'danger';
  if (pct >= 80) return 'warning';
  return 'on-track';
}

export default function BudgetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useBudgets();

  const withBudget = items.filter((i) => i.budget);
  const withoutBudget = items.filter((i) => !i.budget);

  const totalBudget = withBudget.reduce((sum, i) => sum + Number(i.budget.amount), 0);
  const totalSpent = withBudget.reduce((sum, i) => sum + Number(i.spent), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('budgets.title')} showBack />

      <div style={{ flex: 1, padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Total summary card */}
        {!isLoading && withBudget.length > 0 && (
          <div style={{
            background: 'linear-gradient(140deg,#0B1A38,#0A2B38,#0B2A28)',
            borderRadius: 20,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
              {t('budgets.title')}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
                  ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '4px 0 0', fontWeight: 500 }}>
                  of ₹{totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: 0, fontWeight: 600 }}>
                  {Math.round((totalSpent / totalBudget) * 100)}% used
                </p>
              </div>
            </div>
            <ProgressBar pct={Math.round((totalSpent / totalBudget) * 100)} height={6} />
          </div>
        )}

        {isLoading && (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', marginTop: 48 }}>
            {t('common.loading')}
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 64, gap: 10 }}>
            <span style={{ fontSize: 48 }}>💰</span>
            <p style={{ fontSize: 14, color: '#4B5563', fontWeight: 600, margin: 0 }}>{t('budgets.no_categories')}</p>
            <p style={{ fontSize: 12, color: '#B0B8C4', textAlign: 'center', margin: 0 }}>
              {t('budgets.no_categories_desc')}
            </p>
          </div>
        )}

        {/* Active budgets */}
        {withBudget.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, paddingLeft: 4 }}>
              {t('budgets.active')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {withBudget.map((item) => {
                const spentPct = item.percentage;
                const chipColor = pctColor(spentPct);
                return (
                  <SurfaceCard
                    key={item.categoryId}
                    onClick={() => navigate(`/settings/budgets/${item.categoryId}`)}
                    style={{ padding: '14px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Emoji icon box */}
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                        background: item.category.color ? `${item.category.color}22` : '#F0F2F7',
                      }}>
                        {item.category.icon || '🏷️'}
                      </div>

                      {/* Middle content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 14, margin: 0, lineHeight: 1 }}>
                            {item.category.name}
                          </p>
                          {/* Percentage chip */}
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: chipColor,
                            background: spentPct >= 100 ? '#FFF1F3' : spentPct >= 80 ? '#FFFBEB' : '#E6FAF9',
                            borderRadius: 20,
                            padding: '2px 8px',
                            flexShrink: 0,
                          }}>
                            {Math.round(spentPct)}%
                          </span>
                        </div>

                        {/* Amounts */}
                        <p style={{ fontSize: 12, color: '#B0B8C4', margin: '0 0 6px', fontWeight: 500 }}>
                          ₹{item.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          <span style={{ color: '#D1D5DB' }}> / </span>
                          ₹{item.budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>

                        <ProgressBar pct={spentPct} />

                        {/* Over-budget warning */}
                        {spentPct >= 100 && (
                          <div style={{
                            background: '#FFF1F3',
                            borderRadius: 12,
                            padding: '10px 12px',
                            border: '1.5px solid #E11D48',
                            marginTop: 8,
                          }}>
                            <p style={{ fontSize: 11, color: '#E11D48', fontWeight: 700, margin: 0 }}>
                              {t('budgets.over_budget', {
                                amount: (item.spent - item.budget.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          </div>
        )}

        {/* No-limit categories */}
        {withoutBudget.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, paddingLeft: 4 }}>
              {t('budgets.no_limit')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {withoutBudget.map((item) => (
                <SurfaceCard
                  key={item.categoryId}
                  onClick={() => navigate(`/settings/budgets/${item.categoryId}`)}
                  style={{ padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                      background: item.category.color ? `${item.category.color}22` : '#F0F2F7',
                    }}>
                      {item.category.icon || '🏷️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 14, margin: 0 }}>
                        {item.category.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#B0B8C4', margin: '3px 0 0', fontWeight: 500 }}>
                        {t('budgets.spent_tap', { spent: item.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 }) })}
                      </p>
                    </div>
                    <span style={{ color: '#D1D5DB', fontSize: 18, marginLeft: 4 }}>›</span>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
