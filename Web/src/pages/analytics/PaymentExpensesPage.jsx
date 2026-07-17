import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import TransactionRow from '../../components/ui/TransactionRow';
import { useExpenses } from '../../hooks/useExpenses';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function PaymentExpensesPage() {
  const { t } = useTranslation();
  const { paymentTypeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const periodLabel = searchParams.get('period') || '';

  const { data: paymentTypes = [] } = usePaymentTypes();
  const paymentType = paymentTypes.find((p) => p.id === paymentTypeId);

  const { data: expenseData, isLoading } = useExpenses({
    paymentTypeId,
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
    limit: 500,
  });

  const expenses = expenseData?.data || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const iconBg = paymentType?.color ? `${paymentType.color}30` : 'rgba(255,255,255,0.12)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={paymentType?.name || 'Payment Method'} showBack />

      <div style={{ flex: 1, padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero card — dark navy gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0D14 0%, #1a2340 100%)',
          borderRadius: 20,
          padding: '20px 20px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            flexShrink: 0,
          }}>
            {paymentType?.icon || '💳'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              {periodLabel || 'All expenses'}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '2px 0 0', letterSpacing: '-0.5px' }}>
              {fmt(total)}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
              {t('analytics.transactions', { n: expenses.length })}
            </p>
          </div>
        </div>

        {/* Transaction list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 4px', margin: 0 }}>
            Transactions
          </p>

          {isLoading ? (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '40px 0' }}>
              {t('common.loading')}
            </p>
          ) : expenses.length === 0 ? (
            <SurfaceCard style={{ padding: '48px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 40 }}>💳</span>
              <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>{t('analytics.no_expenses')}</p>
            </SurfaceCard>
          ) : (
            <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
              {expenses.map((expense, idx) => (
                <TransactionRow
                  key={expense.id}
                  icon={paymentType?.icon || '💳'}
                  iconBg={paymentType?.color ? `${paymentType.color}25` : '#E6FAF9'}
                  title={expense.title || 'Expense'}
                  subtitle={expense.expenseDate
                    ? new Date(expense.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : ''}
                  amount={`₹${Number(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                  isLast={idx === expenses.length - 1}
                  onClick={() => navigate(`/expense/${expense.id}`)}
                />
              ))}
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}
