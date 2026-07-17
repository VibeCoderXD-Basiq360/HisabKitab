import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { useSavingsGoal, useUpsertSavingsGoal, useDeleteSavingsGoal } from '../../hooks/useSavingsGoal';

export default function SavingsGoalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: goal, isLoading } = useSavingsGoal();
  const upsert = useUpsertSavingsGoal();
  const remove = useDeleteSavingsGoal();

  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');

  useEffect(() => {
    if (goal) {
      setIncome(Number(goal.monthlyIncome) > 0 ? String(Number(goal.monthlyIncome)) : '');
      setSavings(String(Number(goal.monthlySavings)));
    }
  }, [goal]);

  const hasGoal = !!goal;
  const maxSpend = income && savings ? Number(income) - Number(savings) : null;

  function handleSave() {
    const s = Number(savings);
    if (!s || s <= 0) return;
    upsert.mutate(
      { monthlyIncome: Number(income) || 0, monthlySavings: s },
      { onSuccess: () => navigate('/settings') }
    );
  }

  function handleDelete() {
    if (!window.confirm('Remove your savings goal?')) return;
    remove.mutate(undefined, { onSuccess: () => navigate('/settings') });
  }

  const savedPct = hasGoal && Number(goal.monthlySavings) > 0
    ? Math.min(100, Math.round((Number(goal.savedThisMonth ?? 0) / Number(goal.monthlySavings)) * 100))
    : 0;

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.savings_goal')} showBack />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.savings_goal')} showBack />
      <div style={{
        flex: 1,
        padding: '16px 16px',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>

        {/* Hero card — dark navy gradient */}
        <div style={{
          background: 'linear-gradient(140deg,#0B1A38 0%,#0A2B38 55%,#0B2A28 100%)',
          borderRadius: 22,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, margin: 0 }}>
            Monthly savings target
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
            {hasGoal ? `₹${Number(goal.monthlySavings).toLocaleString('en-IN')}` : '—'}
          </p>
          {hasGoal && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Saved this month</span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  ₹{Number(goal.savedThisMonth ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <ProgressBar
                pct={savedPct}
                height={6}
                style={{ background: 'rgba(255,255,255,0.15)' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textAlign: 'right' }}>
                {savedPct}% of goal
              </p>
            </>
          )}
        </div>

        {/* Explainer */}
        <SurfaceCard style={{ padding: '12px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>How it works</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
            Set how much you want to save each month. Optionally enter your income so we can compute your max spending budget. Your home screen will show if the goal is intact.
          </p>
        </SurfaceCard>

        {/* Input card */}
        <SurfaceCard style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Monthly income */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Monthly income{' '}
              <span style={{ color: '#B0B8C4', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#B0B8C4', fontSize: 14, pointerEvents: 'none',
              }}>₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 80000"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingLeft: 32,
                  paddingRight: 14,
                  paddingTop: 11,
                  paddingBottom: 11,
                  background: '#F0F2F7',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0A0D14',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Monthly savings target */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {t('home.savings_goal')} target
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#B0B8C4', fontSize: 14, pointerEvents: 'none',
              }}>₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="e.g. 15000"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingLeft: 32,
                  paddingRight: 14,
                  paddingTop: 11,
                  paddingBottom: 11,
                  background: '#F0F2F7',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0A0D14',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Derived max spend */}
          {maxSpend !== null && (
            <div style={{
              borderRadius: 10,
              padding: '10px 14px',
              background: maxSpend >= 0 ? 'rgba(0,194,178,0.08)' : 'rgba(225,29,72,0.07)',
            }}>
              {maxSpend >= 0 ? (
                <p style={{ fontSize: 13, color: '#00867D', margin: 0 }}>
                  You can spend up to{' '}
                  <span style={{ fontWeight: 800 }}>₹{maxSpend.toLocaleString('en-IN')}</span>/month
                  and still hit your savings goal.
                </p>
              ) : (
                <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>
                  Your savings target exceeds your income by ₹{Math.abs(maxSpend).toLocaleString('en-IN')}. Adjust the numbers.
                </p>
              )}
            </div>
          )}
        </SurfaceCard>

        {/* Monthly contribution row */}
        {hasGoal && Number(goal.monthlyIncome) > 0 && (
          <SurfaceCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>Monthly contribution</span>
            <span style={{ fontSize: 16, color: '#00C2B2', fontWeight: 800 }}>
              ₹{Number(goal.monthlySavings).toLocaleString('en-IN')}
            </span>
          </SurfaceCard>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!savings || Number(savings) <= 0 || upsert.isPending}
          style={{
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            border: 'none',
            padding: '14px 0',
            cursor: !savings || Number(savings) <= 0 || upsert.isPending ? 'not-allowed' : 'pointer',
            opacity: !savings || Number(savings) <= 0 || upsert.isPending ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {upsert.isPending ? t('common.saving') : hasGoal ? 'Update Goal' : 'Set Goal'}
        </button>

        {hasGoal && (
          <button
            onClick={handleDelete}
            disabled={remove.isPending}
            style={{
              background: 'none',
              border: 'none',
              color: '#E11D48',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              padding: '8px 0',
              cursor: remove.isPending ? 'not-allowed' : 'pointer',
              opacity: remove.isPending ? 0.5 : 1,
            }}
          >
            {remove.isPending ? 'Removing…' : 'Remove goal'}
          </button>
        )}
      </div>
    </div>
  );
}
