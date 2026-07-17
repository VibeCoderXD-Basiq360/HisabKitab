import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { useExpenses } from '../../hooks/useExpenses';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import TransactionRow from '../../components/ui/TransactionRow';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const fromDate = startOfMonth(month).toISOString();
  const toDate = endOfMonth(month).toISOString();

  const { data } = useExpenses({ fromDate, toDate, limit: 500 });
  const expenses = data?.data || [];

  // Map date string → { total, count, expenses[] }
  const dayMap = useMemo(() => {
    const map = {};
    for (const e of expenses) {
      const key = e.expenseDate.slice(0, 10);
      if (!map[key]) map[key] = { total: 0, count: 0, expenses: [] };
      map[key].total += Number(e.amount);
      map[key].count += 1;
      map[key].expenses.push(e);
    }
    return map;
  }, [expenses]);

  // Build calendar grid – Mon-Sun weeks
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const monthTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.calendar')} showBack />

      {/* Month navigation */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E9ECF0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
      }}>
        <button
          onClick={() => { setMonth((m) => subMonths(m, 1)); setSelected(null); }}
          style={{
            background: '#fff',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #E9ECF0',
            cursor: 'pointer',
            fontSize: 18,
            color: '#374151',
          }}
        >
          ‹
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>
            {format(month, 'MMMM yyyy')}
          </p>
          <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>
            {fmt(monthTotal)} · {expenses.length} expenses
          </p>
        </div>

        <button
          onClick={() => { setMonth((m) => addMonths(m, 1)); setSelected(null); }}
          style={{
            background: '#fff',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #E9ECF0',
            cursor: 'pointer',
            fontSize: 18,
            color: '#374151',
          }}
        >
          ›
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {/* Day of week headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#FFFFFF',
          borderBottom: '1px solid #E9ECF0',
        }}>
          {DOW.map((d) => (
            <div key={d} style={{
              padding: '8px 0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#B0B8C4',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#FFFFFF',
          borderBottom: '1px solid #E9ECF0',
        }}>
          {gridDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const info = dayMap[key];
            const inMonth = isSameMonth(day, month);
            const isSelected = selected && isSameDay(day, selected);
            const today = isToday(day);

            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : day)}
                style={{
                  position: 'relative',
                  minHeight: 64,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 8,
                  paddingBottom: 4,
                  background: isSelected ? '#E6FAF9' : '#FFFFFF',
                  opacity: inMonth ? 1 : 0.3,
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: '1px solid #E9ECF0',
                  borderRight: '1px solid #E9ECF0',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: today && !isSelected ? 800 : 600,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: isSelected ? '#00C2B2' : 'transparent',
                  color: isSelected ? '#fff' : today ? '#00C2B2' : '#374151',
                }}>
                  {format(day, 'd')}
                </span>

                {info && inMonth && (
                  <>
                    <div style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#00C2B2',
                      marginTop: 4,
                    }} />
                    <span style={{
                      fontSize: 9,
                      color: '#B0B8C4',
                      marginTop: 2,
                      lineHeight: 1,
                    }}>
                      {info.total >= 1000 ? `${(info.total / 1000).toFixed(1)}k` : Math.round(info.total)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day expenses */}
        {selected && (
          <div style={{ marginTop: 12, padding: '0 16px 12px' }}>
            <p style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#B0B8C4',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              {format(selected, 'd MMMM')} ·{' '}
              {selectedData
                ? `${selectedData.count} expense${selectedData.count !== 1 ? 's' : ''} · `
                : 'No expenses'}
              {selectedData && (
                <span style={{ color: '#0A0D14', fontWeight: 800 }}>{fmt(selectedData.total)}</span>
              )}
            </p>

            {selectedData ? (
              <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                {selectedData.expenses.map((e, idx) => (
                  <TransactionRow
                    key={e.id}
                    icon={e.category?.icon || '💸'}
                    iconBg={e.category?.color || '#F0F2F7'}
                    title={e.description || e.category?.name || 'Expense'}
                    subtitle={e.category?.name}
                    amount={fmt(e.amount)}
                    isLast={idx === selectedData.expenses.length - 1}
                    onClick={() => navigate(`/expense/${e.id}`)}
                  />
                ))}
              </SurfaceCard>
            ) : (
              <SurfaceCard>
                <p style={{
                  fontSize: 14,
                  color: '#B0B8C4',
                  textAlign: 'center',
                  padding: '24px 0',
                  margin: 0,
                }}>
                  No expenses on this day
                </p>
              </SurfaceCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
