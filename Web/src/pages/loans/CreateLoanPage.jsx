import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useCreateLoan } from '../../hooks/useLoans';
import { calculateEMI } from '../../utils/emi';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function CreateLoanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateLoan();

  const [form, setForm] = useState({
    name: '',
    principal: '',
    interestRate: '',
    tenureMonths: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const p = Number(form.principal);
  const r = Number(form.interestRate);
  const n = Number(form.tenureMonths);
  const previewEMI = p > 0 && r >= 0 && n > 0 ? calculateEMI(p, r, n) : null;
  const totalPayable = previewEMI ? previewEMI * n : null;
  const totalInterest = totalPayable ? totalPayable - p : null;

  function handleSubmit() {
    if (!form.name || !form.principal || form.interestRate === '' || !form.tenureMonths || !form.startDate) return;
    create.mutate(
      { ...form, principal: p, interestRate: r, tenureMonths: n },
      { onSuccess: (loan) => navigate(`/loans/${loan.id}`) }
    );
  }

  const isValid = form.name && p > 0 && r >= 0 && n > 0 && form.startDate;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('loans.new_loan')} showBack />
      <div className="flex-1 pb-24 p-4 flex flex-col gap-4">

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('loans.loan_name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Car Loan, Home Loan"
              className="px-3 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
            />
          </div>

          {/* Principal */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('loans.principal_amount', 'Principal amount')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.principal}
                onChange={(e) => set('principal', e.target.value)}
                placeholder="e.g. 500000"
                className="w-full pl-7 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Interest rate */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('loans.interest_rate')}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={form.interestRate}
                onChange={(e) => set('interestRate', e.target.value)}
                placeholder="e.g. 8.5"
                className="w-full pr-8 pl-3 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>

          {/* Tenure */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('loans.tenure')}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={form.tenureMonths}
                onChange={(e) => set('tenureMonths', e.target.value)}
                placeholder="e.g. 60"
                className="w-full pr-16 pl-3 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{t('loans.months')}</span>
            </div>
          </div>

          {/* Start date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('loans.start_date')}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className="px-3 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
            />
          </div>
        </div>

        {/* EMI preview */}
        {previewEMI && (
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-700 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider">{t('loans.emi_preview')}</p>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('loans.monthly_emi')}</span>
              <span className="text-sm font-bold text-primary-700 dark:text-primary-300">{fmt(previewEMI)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('loans.total_payable')}</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmt(totalPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">{t('loans.total_interest')}</span>
              <span className="text-sm font-semibold text-red-500">{fmt(totalInterest)}</span>
            </div>
          </div>
        )}

        <Button variant="primary" disabled={!isValid || create.isPending} onClick={handleSubmit}>
          {create.isPending ? t('common.saving') : t('loans.add')}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
