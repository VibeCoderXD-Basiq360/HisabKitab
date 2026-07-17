import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import { useLoans } from '../../hooks/useLoans';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function LoansPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: loans = [], isLoading } = useLoans();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('loans.title')}
        showBack
        action={
          <button
            onClick={() => navigate('/loans/new')}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#00C2B2',
              fontWeight: 300,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        }
      />

      <div
        style={{
          flex: 1,
          padding: '16px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 96,
                  background: '#FFFFFF',
                  borderRadius: 20,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && loans.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 96,
              textAlign: 'center',
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 12, color: '#00C2B2' }}>🏦</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              {t('loans.no_loans')}
            </p>
            <p style={{ fontSize: 14, color: '#B0B8C4', marginBottom: 20 }}>
              {t('loans.no_loans_desc')}
            </p>
            <button
              onClick={() => navigate('/loans/new')}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                color: '#fff',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,194,178,0.5)',
              }}
            >
              {t('loans.add')}
            </button>
          </div>
        )}

        {/* Loan list */}
        {loans.map((loan) => {
          const paid = loan.payments?.length || 0;
          const total = loan.tenureMonths;
          const pct = Math.round((paid / total) * 100);
          const remaining = total - paid;
          const isComplete = paid >= total;

          const initial = (loan.name || '?')[0].toUpperCase();

          return (
            <SurfaceCard
              key={loan.id}
              onClick={() => navigate(`/loans/${loan.id}`)}
              style={{ padding: '14px 16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Top row: avatar + name + badge/amount */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#E6FAF9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#00C2B2',
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#0A0D14',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 2,
                      }}
                    >
                      {loan.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#B0B8C4' }}>
                      {fmt(loan.emiAmount)}/mo · {loan.interestRate}% p.a. · started {format(new Date(loan.startDate), 'MMM yyyy')}
                    </p>
                  </div>

                  {/* Right: badge or principal */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isComplete ? (
                      <Badge variant="on-track" label={t('loans.complete')} />
                    ) : (
                      <>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>
                          {fmt(loan.principal)}
                        </p>
                        <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 2 }}>
                          {t('loans.principal')}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#B0B8C4' }}>
                      {t('loans.emis_paid', { paid, total })}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isComplete ? '#059669' : '#00C2B2',
                      }}
                    >
                      {isComplete ? t('loans.done') : t('loans.left', { n: remaining })}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: 5,
                      background: '#F0F2F7',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isComplete ? '#059669' : '#00C2B2',
                        borderRadius: 999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {/* FAB */}
      {!isLoading && loans.length > 0 && (
        <button
          onClick={() => navigate('/loans/new')}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: 20,
            width: 52,
            height: 52,
            borderRadius: 999,
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            color: '#fff',
            fontSize: 28,
            fontWeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,194,178,0.5)',
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
