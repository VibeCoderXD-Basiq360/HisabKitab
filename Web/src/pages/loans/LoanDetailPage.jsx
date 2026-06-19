import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useLoan, useDeleteLoan, useMarkEMIPaid, useMarkEMIUnpaid } from '../../hooks/useLoans';
import { buildSchedule, remainingBalance } from '../../utils/emi';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtD = (d) => format(new Date(d), 'MMM yyyy');

export default function LoanDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: loan, isLoading } = useLoan(id);
  const deleteLoan = useDeleteLoan();
  const markPaid = useMarkEMIPaid(id);
  const markUnpaid = useMarkEMIUnpaid(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title="Loan" showBack />
        <div className="p-4 animate-pulse flex flex-col gap-3">
          <div className="h-28 bg-white dark:bg-gray-800 rounded-2xl" />
          <div className="h-64 bg-white dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title="Loan" showBack />
        <p className="text-center text-sm text-gray-400 mt-16">Loan not found.</p>
      </div>
    );
  }

  const schedule = buildSchedule(loan.principal, loan.interestRate, loan.tenureMonths, loan.startDate, loan.emiAmount);
  const paidSet = new Set(loan.payments.map((p) => p.month));
  const paidCount = paidSet.size;
  const totalMonths = loan.tenureMonths;
  const pct = Math.round((paidCount / totalMonths) * 100);
  const remaining = remainingBalance(schedule, [...paidSet]);
  const isComplete = paidCount >= totalMonths;

  function toggleMonth(month) {
    if (paidSet.has(month)) {
      markUnpaid.mutate(month);
    } else {
      markPaid.mutate({ month });
    }
  }

  function handleDelete() {
    deleteLoan.mutate(id, { onSuccess: () => navigate('/loans') });
  }

  const isBusy = markPaid.isPending || markUnpaid.isPending;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={loan.name} showBack />

      <div className="flex-1 pb-24 flex flex-col gap-4 p-4">
        {/* Summary card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(remaining)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">remaining balance</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmt(loan.emiAmount)}/mo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{loan.interestRate}% p.a.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{t('loans.emis_paid', { paid: paidCount, total: totalMonths })}</span>
              <span>{isComplete ? t('loans.complete') : t('loans.left', { n: totalMonths - paidCount })}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('loans.principal')}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmt(loan.principal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Started</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtD(loan.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Ends</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {fmtD(schedule[schedule.length - 1]?.dueDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Amortization table */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Repayment Schedule
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <span>#</span>
              <span>Due</span>
              <span className="text-right">EMI</span>
              <span className="text-right">Balance</span>
            </div>

            {schedule.map((row) => {
              const paid = paidSet.has(row.month);
              return (
                <button
                  key={row.month}
                  onClick={() => !isBusy && toggleMonth(row.month)}
                  className={`w-full grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-4 py-3 items-center text-left transition-colors ${
                    paid
                      ? 'bg-green-50 dark:bg-green-900/10 active:bg-green-100 dark:active:bg-green-900/20'
                      : 'active:bg-gray-50 dark:active:bg-gray-700'
                  } ${isBusy ? 'opacity-60' : ''}`}
                >
                  {/* EMI number / checkmark */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    paid
                      ? 'bg-green-500 text-white'
                      : new Date(row.dueDate) < new Date()
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {paid ? '✓' : row.month}
                  </div>

                  {/* Due date + breakdown */}
                  <div>
                    <p className={`text-sm ${paid ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {format(row.dueDate, 'MMM yyyy')}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      P {fmt(row.principal)} · I {fmt(row.interest)}
                    </p>
                  </div>

                  {/* EMI amount */}
                  <p className={`text-sm font-semibold text-right ${paid ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {fmt(row.emi)}
                  </p>

                  {/* Closing balance */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                    {fmt(row.closing)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-400 text-center py-2"
          >
            Delete this loan
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-red-700 dark:text-red-300">Delete "{loan.name}"?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoan.isPending}
                className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                {deleteLoan.isPending ? '…' : t('common.delete')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-xl"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
