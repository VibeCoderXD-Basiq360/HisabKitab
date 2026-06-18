import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useLoans } from '../../hooks/useLoans';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function LoansPage() {
  const navigate = useNavigate();
  const { data: loans = [], isLoading } = useLoans();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar
        title="EMI Tracker"
        showBack
        action={
          <button
            onClick={() => navigate('/loans/new')}
            className="w-10 h-10 flex items-center justify-center text-2xl text-primary-600 font-light"
          >
            +
          </button>
        }
      />

      <div className="flex-1 pb-24 p-4 flex flex-col gap-3">
        {isLoading && (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && loans.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
            <p className="text-4xl mb-3">🏦</p>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">No loans tracked</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-5">
              Add a loan to track EMIs and see your repayment progress.
            </p>
            <button
              onClick={() => navigate('/loans/new')}
              className="px-6 py-3 bg-primary-500 text-white rounded-2xl text-sm font-semibold active:bg-primary-600"
            >
              + Add Loan
            </button>
          </div>
        )}

        {loans.map((loan) => {
          const paid = loan.payments?.length || 0;
          const total = loan.tenureMonths;
          const pct = Math.round((paid / total) * 100);
          const remaining = total - paid;
          const isComplete = paid >= total;

          return (
            <button
              key={loan.id}
              onClick={() => navigate(`/loans/${loan.id}`)}
              className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 text-left shadow-sm active:bg-gray-50 dark:active:bg-gray-700 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{loan.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {fmt(loan.emiAmount)}/mo · {loan.interestRate}% p.a. · started {format(new Date(loan.startDate), 'MMM yyyy')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isComplete ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      ✓ Complete
                    </span>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(loan.principal)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">principal</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{paid} of {total} EMIs paid</span>
                  <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-primary-600 dark:text-primary-400'}`}>
                    {isComplete ? 'Done' : `${remaining} left`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
