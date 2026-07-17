import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title="Loan" showBack />
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 120, background: '#fff', borderRadius: 16, opacity: 0.6 }} />
          <div style={{ height: 240, background: '#fff', borderRadius: 16, opacity: 0.6 }} />
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopBar title="Loan" showBack />
        <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', marginTop: 64 }}>
          Loan not found.
        </p>
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={loan.name} showBack />

      <div style={{
        flex: 1,
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
      }}>

        {/* Hero card — dark navy gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 20,
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Borrower / lender name */}
          <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>{loan.name}</p>

          {/* Principal */}
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>Principal</p>
            <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
              {fmt(loan.principal)}
            </p>
          </div>

          {/* Remaining balance teal sub-line */}
          <p style={{ fontSize: 14, color: '#00C2B2', fontWeight: 600, margin: 0 }}>
            {fmt(remaining)} remaining
          </p>

          {/* Progress */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {t('loans.emis_paid', { paid: paidCount, total: totalMonths })}
              </span>
              <span style={{ fontSize: 12, color: isComplete ? '#00C2B2' : 'rgba(255,255,255,0.55)' }}>
                {isComplete ? t('loans.complete') : t('loans.left', { n: totalMonths - paidCount })}
              </span>
            </div>
            <ProgressBar value={pct} color={isComplete ? '#059669' : '#00C2B2'} />
          </div>
        </div>

        {/* Loan info grid — 2-col SurfaceCard */}
        <SurfaceCard style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
            {[
              { label: 'Interest Rate', value: `${loan.interestRate}% p.a.` },
              { label: 'Tenure', value: `${loan.tenureMonths} months` },
              { label: 'Monthly EMI', value: `${fmt(loan.emiAmount)}/mo` },
              { label: 'Started', value: fmtD(loan.startDate) },
              { label: 'Ends', value: fmtD(schedule[schedule.length - 1]?.dueDate) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 11, color: '#B0B8C4', marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Repayment schedule */}
        <div>
          <p style={{
            fontSize: 12, fontWeight: 700, color: '#B0B8C4',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Repayment Schedule
          </p>

          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2rem 1fr 1fr 1fr',
              gap: 8,
              padding: '8px 16px',
              fontSize: 10,
              fontWeight: 700,
              color: '#B0B8C4',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: '1px solid #F0F2F7',
            }}>
              <span>#</span>
              <span>Due</span>
              <span style={{ textAlign: 'right' }}>EMI</span>
              <span style={{ textAlign: 'right' }}>Balance</span>
            </div>

            {schedule.map((row, idx) => {
              const paid = paidSet.has(row.month);
              const overdue = !paid && new Date(row.dueDate) < new Date();
              return (
                <button
                  key={row.month}
                  onClick={() => !isBusy && toggleMonth(row.month)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '2rem 1fr 1fr 1fr',
                    gap: 8,
                    padding: '12px 16px',
                    alignItems: 'center',
                    textAlign: 'left',
                    background: paid ? '#F0FDF4' : 'transparent',
                    borderBottom: idx < schedule.length - 1 ? '1px solid #F0F2F7' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: isBusy ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Month badge */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: paid ? '#059669' : overdue ? '#FEE2E2' : '#F0F2F7',
                    color: paid ? '#fff' : overdue ? '#E11D48' : '#374151',
                  }}>
                    {paid ? '✓' : row.month}
                  </div>

                  {/* Date + breakdown */}
                  <div>
                    <p style={{
                      fontSize: 13,
                      color: paid ? '#059669' : '#0A0D14',
                      fontWeight: 500,
                      margin: 0,
                    }}>
                      {format(row.dueDate, 'MMM yyyy')}
                    </p>
                    <p style={{ fontSize: 10, color: '#B0B8C4', margin: '1px 0 0' }}>
                      P {fmt(row.principal)} · I {fmt(row.interest)}
                    </p>
                  </div>

                  {/* EMI amount */}
                  <p style={{
                    fontSize: 13, fontWeight: 700, textAlign: 'right',
                    color: paid ? '#059669' : '#0A0D14',
                    margin: 0,
                  }}>
                    {fmt(row.emi)}
                  </p>

                  {/* Closing balance */}
                  <p style={{ fontSize: 11, color: '#B0B8C4', textAlign: 'right', margin: 0 }}>
                    {fmt(row.closing)}
                  </p>
                </button>
              );
            })}
          </SurfaceCard>
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#E11D48', textAlign: 'center', padding: '8px 0',
            }}
          >
            Delete this loan
          </button>
        ) : (
          <div style={{
            background: '#FFF1F2', border: '1px solid #FECDD3',
            borderRadius: 16, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <p style={{ fontSize: 13, color: '#BE123C', margin: 0 }}>Delete "{loan.name}"?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={deleteLoan.isPending}
                style={{
                  padding: '6px 14px', background: '#E11D48', color: '#fff',
                  fontSize: 12, fontWeight: 700, borderRadius: 10,
                  border: 'none', cursor: 'pointer', opacity: deleteLoan.isPending ? 0.5 : 1,
                }}
              >
                {deleteLoan.isPending ? '…' : t('common.delete')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '6px 14px', background: '#F0F2F7', color: '#374151',
                  fontSize: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
