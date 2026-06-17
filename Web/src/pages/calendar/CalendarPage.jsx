import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { useExpenses } from '../../hooks/useExpenses';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import ExpenseCard from '../../components/ExpenseCard';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function CalendarPage() {
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

  // Build calendar grid — Mon-Sun weeks
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const monthTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const selectedKey = selected ? format(selected, 'yyyy-MM-dd') : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function dotColor(total) {
    if (total > 2000) return 'bg-red-400';
    if (total > 500) return 'bg-amber-400';
    return 'bg-green-400';
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Calendar" showBack />

      {/* Month navigation */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <button onClick={() => { setMonth((m) => subMonths(m, 1)); setSelected(null); }} className="w-9 h-9 flex items-center justify-center text-gray-500 text-lg rounded-xl active:bg-gray-100">‹</button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{format(month, 'MMMM yyyy')}</p>
          <p className="text-xs text-gray-400">{fmt(monthTotal)} · {expenses.length} expenses</p>
        </div>
        <button onClick={() => { setMonth((m) => addMonths(m, 1)); setSelected(null); }} className="w-9 h-9 flex items-center justify-center text-gray-500 text-lg rounded-xl active:bg-gray-100">›</button>
      </div>

      <div className="flex-1 overflow-auto pb-28">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 bg-white border-b border-gray-100">
          {DOW.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 bg-white border-b border-gray-100">
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
                className={`relative min-h-[64px] flex flex-col items-center pt-2 pb-1 border-b border-r border-gray-50 transition-colors ${
                  isSelected ? 'bg-primary-50' : 'active:bg-gray-50'
                } ${!inMonth ? 'opacity-30' : ''}`}
              >
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary-500 text-white' : isSelected ? 'text-primary-600' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </span>
                {info && inMonth && (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${dotColor(info.total)}`} />
                    <span className="text-[9px] text-gray-400 mt-0.5 leading-none">
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
          <div className="mt-3 px-4 mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {format(selected, 'd MMMM')} · {selectedData ? `${selectedData.count} expense${selectedData.count !== 1 ? 's' : ''} · ${fmt(selectedData.total)}` : 'No expenses'}
            </p>
            {selectedData ? (
              <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
                {selectedData.expenses.map((e) => (
                  <ExpenseCard key={e.id} expense={e} onClick={() => navigate(`/expense/${e.id}`)} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">No expenses on this day</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
