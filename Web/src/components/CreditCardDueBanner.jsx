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

// Inline style maps — no dark: variants
const URGENCY = {
  overdue: {
    bg: '#FFF1F3',
    border: '#F43F5E',
    textColor: '#E11D48',
    subColor: '#E11D48',
  },
  urgent: {
    bg: '#FFF7ED',
    border: '#F97316',
    textColor: '#C2410C',
    subColor: '#EA580C',
  },
  normal: {
    bg: '#FEFCE8',
    border: '#EAB308',
    textColor: '#854D0E',
    subColor: '#CA8A04',
  },
};

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

        const urgency = isOverdue || isDueToday
          ? URGENCY.overdue
          : isUrgent
          ? URGENCY.urgent
          : URGENCY.normal;

        const label = isOverdue
          ? `Overdue by ${Math.abs(card.days)} day${Math.abs(card.days) !== 1 ? 's' : ''}`
          : isDueToday
          ? 'Due today — pay now!'
          : card.days === 1
          ? 'Due tomorrow'
          : `Due in ${card.days} days · ${fmt(card.dueDate)}`;

        return (
          <div
            key={card.id}
            className="flex items-start gap-3"
            style={{
              background: urgency.bg,
              border: `1.5px solid ${urgency.border}`,
              borderRadius: 12,
              padding: '12px 16px',
            }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                fontSize: 16,
                backgroundColor: card.color ? `${card.color}30` : '#e0e7ff',
              }}
            >
              {card.icon || '🏦'}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 600, color: urgency.textColor }}>{card.name}</p>
              <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2, color: urgency.subColor }}>{label}</p>
              {card.cycle && (
                <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 2 }}>
                  Current cycle: {fmt(card.cycle.start)} – {fmt(card.cycle.end)}
                </p>
              )}
            </div>
            <div
              className="tabular-nums"
              style={{ fontSize: 24, fontWeight: 900, color: urgency.textColor }}
            >
              {isOverdue ? '!' : card.days}
              {!isOverdue && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>d</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
