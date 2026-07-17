import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import { usePaidForPerson, useRequestPayment, useAcceptPayment, useRejectPayment } from '../../hooks/useSplits';

function StatusBadge({ status }) {
  const { t } = useTranslation();
  if (status === 'CONFIRMED')
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
        background: '#D1FAE5', color: '#059669',
      }}>
        {t('balance.settled')}
      </span>
    );
  if (status === 'PAYMENT_REQUESTED')
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
        background: '#FEF3C7', color: '#D97706',
      }}>
        {t('balance.claimed_paid')}
      </span>
    );
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: '#F0F2F7', color: '#B0B8C4',
    }}>
      {t('balance.pending')}
    </span>
  );
}

export default function PersonExpensesPage() {
  const { t } = useTranslation();
  const { personId } = useParams();
  const { data: expenses = [], isLoading } = usePaidForPerson(personId);

  const pay = useRequestPayment();
  const accept = useAcceptPayment();
  const reject = useRejectPayment();
  const isBusy = pay.isPending || accept.isPending || reject.isPending;

  const person = expenses[0]?.paidForPerson;
  const personName = person?.name || '…';

  const totalOutstanding = expenses.reduce((sum, e) => {
    const split = e.splits?.[0];
    return split?.status !== 'CONFIRMED' ? sum + Number(e.amount) : sum;
  }, 0);
  const totalSettled = expenses.reduce((sum, e) => {
    const split = e.splits?.[0];
    return split?.status === 'CONFIRMED' ? sum + Number(e.amount) : sum;
  }, 0);

  const initials = personName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={personName} showBack />

      <div style={{ flex: 1, padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero card with person + balance summary */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0D14 0%, #1a2340 100%)',
          borderRadius: 20,
          padding: '20px 20px 22px',
        }}>
          {/* Person row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              background: 'linear-gradient(135deg, #00C2B2, #0097a7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#FFFFFF',
              flexShrink: 0,
            }}>
              {initials || '👤'}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{personName}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''} together
              </p>
            </div>
          </div>

          {/* Balance summary pills */}
          {(totalOutstanding > 0 || totalSettled > 0) && (
            <div style={{ display: 'flex', gap: 10 }}>
              {totalOutstanding > 0 && (
                <div style={{
                  flex: 1,
                  background: 'rgba(225,29,72,0.15)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  border: '1px solid rgba(225,29,72,0.25)',
                }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{t('balance.outstanding')}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#E11D48', margin: '4px 0 0' }}>
                    ₹{totalOutstanding.toFixed(2)}
                  </p>
                </div>
              )}
              {totalSettled > 0 && (
                <div style={{
                  flex: 1,
                  background: 'rgba(5,150,105,0.15)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  border: '1px solid rgba(5,150,105,0.25)',
                }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{t('balance.settled')}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>
                    ₹{totalSettled.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {expenses.length === 0 && !isLoading && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>No expenses yet</p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', paddingTop: 48 }}>
            {t('common.loading')}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && expenses.length === 0 && (
          <SurfaceCard style={{ padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 44 }}>🧾</span>
            <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>No expenses paid for {personName}</p>
          </SurfaceCard>
        )}

        {/* Expense cards */}
        {expenses.map((expense) => {
          const split = expense.splits?.[0];
          const status = split?.status || 'PENDING';
          const amount = Number(expense.amount);
          const date = expense.expenseDate
            ? format(new Date(expense.expenseDate), 'd MMM yyyy')
            : '';

          return (
            <SurfaceCard key={expense.id} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Main row */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {expense.title || 'Expense'}
                  </p>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: '3px 0 0' }}>{date}</p>
                  {expense.category && (
                    <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>{expense.category.name}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14' }}>₹{amount.toFixed(2)}</span>
                  <StatusBadge status={status} />
                </div>
              </div>

              {/* Accept / Reject actions */}
              {split && status === 'PAYMENT_REQUESTED' && (
                <div style={{ padding: '0 16px 14px', display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => accept.mutate(split.id)}
                    disabled={isBusy}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #00C2B2, #0097a7)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    {t('balance.accept')}
                  </button>
                  <button
                    onClick={() => reject.mutate(split.id)}
                    disabled={isBusy}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 12,
                      border: 'none',
                      background: '#E11D48',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    {t('balance.reject')}
                  </button>
                </div>
              )}

              {/* Waiting note */}
              {split && status === 'PENDING' && (
                <div style={{ padding: '0 16px 12px', borderTop: '1px solid #F0F2F7' }}>
                  <p style={{ fontSize: 12, color: '#B0B8C4', textAlign: 'center', margin: '10px 0 0' }}>
                    {t('balance.waiting')}
                  </p>
                </div>
              )}

              {/* Confirmed note */}
              {status === 'CONFIRMED' && (
                <div style={{ padding: '0 16px 12px', borderTop: '1px solid #F0F2F7' }}>
                  <p style={{ fontSize: 12, color: '#059669', textAlign: 'center', margin: '10px 0 0', fontWeight: 600 }}>
                    {t('balance.settled')}
                  </p>
                </div>
              )}
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
}
