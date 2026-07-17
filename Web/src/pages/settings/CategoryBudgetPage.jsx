import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
import { useBudgets, useUpsertBudget, useDeleteBudget } from '../../hooks/useBudgets';

function barColor(pct) {
  if (pct >= 100) return '#E11D48';
  if (pct >= 80) return '#F59E0B';
  return '#059669';
}

function BudgetSheet({ item, onClose }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(item.budget ? String(item.budget.amount) : '');
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'relative', width: '100%',
        background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 36px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            background: item.category.color ? `${item.category.color}22` : '#F0F2F7',
          }}>
            {item.category.icon || '🏷️'}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
              {item.budget ? 'Edit limit' : 'Set limit'} for {item.category.name}
            </p>
            <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>Monthly spending limit</p>
          </div>
        </div>

        {/* Amount input */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#B0B8C4', fontSize: 16, fontWeight: 600, pointerEvents: 'none',
          }}>₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#F0F2F7', border: 'none', borderRadius: 10,
              padding: '11px 14px 11px 30px',
              fontSize: 16, fontWeight: 700, color: '#0A0D14', outline: 'none',
            }}
          />
        </div>

        {/* Save */}
        <button
          onClick={() => {
            const val = parseFloat(amount);
            if (!val || val <= 0) return;
            upsert.mutate({ categoryId: item.categoryId, amount: val }, { onSuccess: onClose });
          }}
          disabled={upsert.isPending || !amount || parseFloat(amount) <= 0}
          style={{
            width: '100%', padding: '14px 0',
            background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            opacity: upsert.isPending || !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
          }}
        >
          {upsert.isPending ? t('common.saving') : t('common.save')}
        </button>

        {item.budget && (
          <button
            onClick={() => del.mutate(item.budget.id, { onSuccess: onClose })}
            disabled={del.isPending}
            style={{
              width: '100%', padding: '12px 0',
              background: 'none', border: '1px solid #FECDD3',
              color: '#E11D48', borderRadius: 12,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {del.isPending ? 'Removing…' : 'Remove Limit'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CategoryBudgetPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams();
  const [editOpen, setEditOpen] = useState(false);

  const { data: allBudgets = [], isLoading } = useBudgets();
  const item = allBudgets.find((b) => b.categoryId === categoryId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title={t('budgets.title')} showBack />
        <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', marginTop: 64 }}>
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (!item) return null;

  const cat = item.category;
  const budget = item.budget;
  const spent = item.spent;
  const percentage = budget ? Math.round((spent / budget.amount) * 100) : null;
  const remaining = budget ? budget.amount - spent : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={cat.name} showBack />

      <div style={{
        flex: 1,
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>

        {budget ? (
          <>
            {/* Hero card — dark navy gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: 20,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Category name + icon row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                  background: cat.color ? `${cat.color}30` : 'rgba(255,255,255,0.12)',
                }}>
                  {cat.icon || '🏷️'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{cat.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>Monthly budget</p>
                </div>
                <button
                  onClick={() => setEditOpen(true)}
                  style={{
                    fontSize: 12, fontWeight: 700, color: '#00C2B2',
                    background: 'rgba(0,194,178,0.15)', border: 'none', borderRadius: 20,
                    padding: '6px 14px', cursor: 'pointer',
                  }}
                >
                  {t('common.edit')}
                </button>
              </div>

              {/* Budget amount */}
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>Monthly Budget</p>
                <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
                  ₹{budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    {t('budgets.used', { pct: percentage })}
                  </span>
                  {remaining >= 0 ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2' }}>
                      ₹{remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F87171' }}>
                      {t('budgets.over_budget', { amount: `₹${Math.abs(remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` })}
                    </span>
                  )}
                </div>
                <ProgressBar value={Math.min(percentage, 100)} color={barColor(percentage)} />
              </div>
            </div>

            {/* Spend summary card */}
            <SurfaceCard style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: '0 0 4px' }}>Spent this month</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
                    ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: '0 0 4px' }}>Limit</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#374151', margin: 0 }}>
                    ₹{budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </>
        ) : (
          /* No budget set */
          <SurfaceCard style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                background: cat.color ? `${cat.color}22` : '#F0F2F7',
              }}>
                {cat.icon || '🏷️'}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{cat.name}</p>
                <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>{t('budgets.no_limit')}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#B0B8C4', margin: 0 }}>
              ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent this month with no limit.
            </p>

            <button
              onClick={() => setEditOpen(true)}
              style={{
                width: '100%', padding: '14px 0',
                background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Set Monthly Limit
            </button>
          </SurfaceCard>
        )}
      </div>

      {editOpen && <BudgetSheet item={item} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
