import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import { useCreateLoan } from '../../hooks/useLoans';
import { calculateEMI } from '../../utils/emi';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inputStyle = {
  width: '100%',
  background: '#F0F2F7',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 15,
  color: '#0A0D14',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#B0B8C4',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
  display: 'block',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('loans.new_loan')} showBack />

      <div style={{
        flex: 1,
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>

        <SurfaceCard style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Loan name */}
          <div>
            <label style={labelStyle}>{t('loans.loan_name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Car Loan, Home Loan"
              style={inputStyle}
            />
          </div>

          {/* Principal */}
          <div>
            <label style={labelStyle}>{t('loans.principal_amount', 'Principal amount')}</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#B0B8C4', fontSize: 15, pointerEvents: 'none',
              }}>₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.principal}
                onChange={(e) => set('principal', e.target.value)}
                placeholder="500000"
                style={{ ...inputStyle, paddingLeft: 28 }}
              />
            </div>
          </div>

          {/* Interest rate */}
          <div>
            <label style={labelStyle}>{t('loans.interest_rate')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="decimal"
                value={form.interestRate}
                onChange={(e) => set('interestRate', e.target.value)}
                placeholder="8.5"
                style={{ ...inputStyle, paddingRight: 36 }}
              />
              <span style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#B0B8C4', fontSize: 15, pointerEvents: 'none',
              }}>%</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <label style={labelStyle}>{t('loans.tenure')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                inputMode="numeric"
                value={form.tenureMonths}
                onChange={(e) => set('tenureMonths', e.target.value)}
                placeholder="60"
                style={{ ...inputStyle, paddingRight: 70 }}
              />
              <span style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#B0B8C4', fontSize: 13, pointerEvents: 'none',
              }}>{t('loans.months')}</span>
            </div>
          </div>

          {/* Start date */}
          <div>
            <label style={labelStyle}>{t('loans.start_date')}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              style={inputStyle}
            />
          </div>
        </SurfaceCard>

        {/* EMI preview */}
        {previewEMI && (
          <div style={{
            background: '#E6FAF9',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#009E90',
              textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
            }}>
              {t('loans.emi_preview')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#374151' }}>{t('loans.monthly_emi')}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#00C2B2' }}>{fmt(previewEMI)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#374151' }}>{t('loans.total_payable')}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>{fmt(totalPayable)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#374151' }}>{t('loans.total_interest')}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#E11D48' }}>{fmt(totalInterest)}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || create.isPending}
          style={{
            width: '100%',
            padding: '15px 0',
            background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 800,
            cursor: isValid && !create.isPending ? 'pointer' : 'not-allowed',
            opacity: isValid && !create.isPending ? 1 : 0.5,
          }}
        >
          {create.isPending ? t('common.saving') : t('loans.add')}
        </button>
      </div>
    </div>
  );
}
