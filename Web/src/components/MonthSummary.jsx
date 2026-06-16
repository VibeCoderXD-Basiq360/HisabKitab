import { formatCurrency } from '../utils/currency';

export default function MonthSummary({ total, count }) {
  return (
    <div className="mx-4 mb-4 p-5 bg-primary-500 rounded-2xl text-white">
      <p className="text-sm opacity-80">This month</p>
      <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
      <p className="text-sm opacity-70 mt-1">
        {count} expense{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
