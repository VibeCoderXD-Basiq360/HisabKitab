import { usePaymentTypes } from '../hooks/usePaymentTypes';

function getNextDueDate(paymentDueDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);
  thisMonth.setHours(0, 0, 0, 0);
  return thisMonth >= today ? thisMonth : new Date(today.getFullYear(), today.getMonth() + 1, paymentDueDay);
}

function getBillingCycleDates(billingCycleDay) {
  const today = new Date();
  const d = today.getDate();
  const start = d >= billingCycleDay
    ? new Date(today.getFullYear(), today.getMonth(), billingCycleDay)
    : new Date(today.getFullYear(), today.getMonth() - 1, billingCycleDay);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, billingCycleDay - 1);
  return { start, end };
}

const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function CreditCardDueBanner() {
  const { data: types = [] } = usePaymentTypes();

  const cards = types
    .filter((t) => t.cardType === 'CREDIT_CARD' && t.paymentDueDay)
    .map((t) => {
      const dueDate = getNextDueDate(t.paymentDueDay);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.round((dueDate - today) / 86400000);
      const cycle = t.billingCycleDay ? getBillingCycleDates(t.billingCycleDay) : null;
      return { ...t, dueDate, days, cycle };
    })
    .filter((c) => c.days <= 10)
    .sort((a, b) => a.days - b.days);

  if (cards.length === 0) return null;

  return (
    <div className="mx-4 flex flex-col gap-2">
      {cards.map((card) => {
        const isOverdue = card.days < 0;
        const isDueToday = card.days === 0;
        const isUrgent = card.days <= 3;

        const bg = isOverdue || isDueToday
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : isUrgent
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';

        const textColor = isOverdue || isDueToday
          ? 'text-red-700 dark:text-red-400'
          : isUrgent
          ? 'text-orange-700 dark:text-orange-400'
          : 'text-yellow-700 dark:text-yellow-500';

        const subColor = isOverdue || isDueToday
          ? 'text-red-500 dark:text-red-500'
          : isUrgent
          ? 'text-orange-500 dark:text-orange-500'
          : 'text-yellow-600 dark:text-yellow-600';

        const label = isOverdue
          ? `Overdue by ${Math.abs(card.days)} day${Math.abs(card.days) !== 1 ? 's' : ''}`
          : isDueToday
          ? 'Due today — pay now!'
          : card.days === 1
          ? 'Due tomorrow'
          : `Due in ${card.days} days · ${fmt(card.dueDate)}`;

        return (
          <div key={card.id} className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${bg}`}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ backgroundColor: card.color ? `${card.color}30` : '#e0e7ff' }}
            >
              {card.icon || '🏦'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${textColor}`}>{card.name}</p>
              <p className={`text-xs font-medium mt-0.5 ${subColor}`}>{label}</p>
              {card.cycle && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Current cycle: {fmt(card.cycle.start)} – {fmt(card.cycle.end)}
                </p>
              )}
            </div>
            <div className={`text-2xl font-black tabular-nums ${textColor}`}>
              {isOverdue ? '!' : card.days}
              {!isOverdue && <span className="text-xs font-normal ml-0.5">d</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
