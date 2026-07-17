import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifyIdentitySheet from '../../components/VerifyIdentitySheet';
import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from '../../hooks/usePaymentTypes';
import { useCardDelegations, useCreateDelegation } from '../../hooks/useCardDelegation';
import { useAccounts } from '../../hooks/useAccounts';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);
const REMINDER_OPTIONS = [1, 2, 3, 5, 7, 10];

const EMPTY_FORM = {
  name: '',
  cardType: '',
  billingCycleDay: '',
  paymentDueDay: '',
  reminderDaysBefore: 3,
  reminderEnabled: false,
  cardLastFour: '',
  cardHolderName: '',
  cardExpiry: '',
  linkedAccountId: '',
};

const inputStyle = {
  background: '#F0F2F7',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: '#0A0D14',
  outline: 'none',
  width: '100%',
  minHeight: 44,
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: '#B0B8C4',
  marginBottom: 4,
  display: 'block',
};

function PaymentTypeSheet({ initial, onSave, onClose, isPending, accounts }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isCC = form.cardType === 'CREDIT_CARD';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      cardType: form.cardType || null,
      billingCycleDay: isCC && form.billingCycleDay ? Number(form.billingCycleDay) : null,
      paymentDueDay: isCC && form.paymentDueDay ? Number(form.paymentDueDay) : null,
      reminderDaysBefore: isCC ? Number(form.reminderDaysBefore) : null,
      reminderEnabled: isCC ? form.reminderEnabled : false,
      cardLastFour:   isCC && form.cardLastFour   ? form.cardLastFour.trim()   : null,
      cardHolderName: isCC && form.cardHolderName ? form.cardHolderName.trim() : null,
      cardExpiry:     isCC && form.cardExpiry     ? form.cardExpiry.trim()     : null,
      linkedAccountId: form.linkedAccountId || null,
    });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(10,13,20,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 4, margin: '0 auto' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
          {initial ? `${t('common.edit')} ${t('expense.payment_type').toLowerCase()}` : `New ${t('expense.payment_type').toLowerCase()}`}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={field('name')}
              placeholder="e.g. HDFC Credit Card"
              style={inputStyle}
            />
          </div>

          {/* Card type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: '', label: 'Generic', icon: '💰' },
                { value: 'DEBIT_CARD', label: 'Debit', icon: '💳' },
                { value: 'CREDIT_CARD', label: 'Credit', icon: '🏦' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, cardType: opt.value }))}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    background: form.cardType === opt.value ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#F0F2F7',
                    color: form.cardType === opt.value ? '#fff' : '#6B7280',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credit card fields */}
          {isCC && (
            <>
              <div style={{ height: 1, background: '#F0F2F7' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', margin: 0 }}>
                Card Identity
              </p>

              {/* Cardholder name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={labelStyle}>Cardholder name</label>
                <input
                  type="text"
                  value={form.cardHolderName}
                  onChange={field('cardHolderName')}
                  placeholder="Name printed on card"
                  style={inputStyle}
                />
              </div>

              {/* Last 4 digits + expiry */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Last 4 digits</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.cardLastFour}
                    onChange={(e) => setForm((f) => ({ ...f, cardLastFour: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="1234"
                    maxLength={4}
                    style={{ ...inputStyle, letterSpacing: '0.15em' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setForm((f) => ({ ...f, cardExpiry: v }));
                    }}
                    placeholder="08/27"
                    maxLength={5}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ height: 1, background: '#F0F2F7' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', margin: 0 }}>
                Billing &amp; Reminders
              </p>

              {/* Billing cycle & due day */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Billing cycle starts</label>
                  <select
                    value={form.billingCycleDay}
                    onChange={field('billingCycleDay')}
                    style={inputStyle}
                  >
                    <option value="">{t('expense.select')}</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={labelStyle}>Payment due on</label>
                  <select
                    value={form.paymentDueDay}
                    onChange={field('paymentDueDay')}
                    style={inputStyle}
                  >
                    <option value="">{t('expense.select')}</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F2F7', borderRadius: 12, padding: '12px 14px' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>Due date reminders</p>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>Push + email before due date</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reminderEnabled: !f.reminderEnabled }))}
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 13,
                    background: form.reminderEnabled ? '#00C2B2' : '#D1D5DB',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s ease',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: form.reminderEnabled ? 'calc(100% - 23px)' : 3,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                      transition: 'left 0.2s ease',
                      display: 'block',
                    }}
                  />
                </button>
              </div>

              {form.reminderEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Remind me this many days before due date</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {REMINDER_OPTIONS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, reminderDaysBefore: d }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: Number(form.reminderDaysBefore) === d ? 'linear-gradient(135deg,#00C2B2,#009E90)' : '#F0F2F7',
                          color: Number(form.reminderDaysBefore) === d ? '#fff' : '#6B7280',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {d} day{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>
                    You'll also get a reminder on the due day itself.
                  </p>
                </div>
              )}
            </>
          )}

          {accounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>
                🔗 Link to account <span style={{ fontWeight: 400 }}>(optional — auto-tracks balance)</span>
              </label>
              <select
                value={form.linkedAccountId}
                onChange={field('linkedAccountId')}
                style={inputStyle}
              >
                <option value="">No account linked</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              {form.linkedAccountId && (
                <p style={{ fontSize: 11, color: '#00C2B2', margin: 0 }}>
                  Expenses paid with this method will auto-deduct from this account
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!form.name.trim() || isPending}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#00C2B2,#009E90)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: !form.name.trim() || isPending ? 'not-allowed' : 'pointer',
              opacity: !form.name.trim() || isPending ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {isPending ? t('common.saving') : initial ? t('common.save') : `${t('common.add')} ${t('expense.payment_type').toLowerCase()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function dueDateInfo(paymentDueDay, billingCycleDay) {
  if (!paymentDueDay) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), paymentDueDay);
  const dueDate = thisMonthDue >= today
    ? thisMonthDue
    : new Date(today.getFullYear(), today.getMonth() + 1, paymentDueDay);
  const days = Math.round((dueDate - today) / 86400000);

  let cycleText = null;
  if (billingCycleDay) {
    const d = today.getDate();
    const cycleStart = d >= billingCycleDay
      ? new Date(today.getFullYear(), today.getMonth(), billingCycleDay)
      : new Date(today.getFullYear(), today.getMonth() - 1, billingCycleDay);
    const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, billingCycleDay - 1);
    const fmt = (dt) => dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    cycleText = `${fmt(cycleStart)} – ${fmt(cycleEnd)}`;
  }

  return { days, dueDate, cycleText };
}

function DelegateSheet({ paymentType, onClose }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [actionToken, setActionToken] = useState(null);
  const createDelegation = useCreateDelegation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!actionToken) { setShowVerify(true); return; }
    try {
      await createDelegation.mutateAsync({ paymentTypeId: paymentType.id, ownerEmail: email.trim(), _actionToken: actionToken });
      onClose();
    } catch (err) {
      setActionToken(null);
      alert(err?.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(10,13,20,0.55)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 4, margin: '0 auto' }} />
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0A0D14', margin: 0 }}>Link {paymentType.name} to card owner</h2>
          <p style={{ fontSize: 12, color: '#B0B8C4', margin: '4px 0 0' }}>
            Expenses on this card will be logged by you but the owner will be notified. You can mark specific ones as "to repay."
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle}>Card owner's email (must have HisabKitab account)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setActionToken(null); }}
              placeholder="dad@email.com"
              style={inputStyle}
            />
          </div>
          {actionToken && (
            <p style={{ fontSize: 12, color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ Identity verified — ready to send
            </p>
          )}
          <button
            type="submit"
            disabled={!email.trim() || createDelegation.isPending}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#00C2B2,#009E90)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              border: 'none',
              cursor: !email.trim() || createDelegation.isPending ? 'not-allowed' : 'pointer',
              opacity: !email.trim() || createDelegation.isPending ? 0.5 : 1,
            }}
          >
            {createDelegation.isPending ? 'Sending request…' : actionToken ? 'Send delegation request' : 'Verify identity & send'}
          </button>
        </form>
      </div>
      {showVerify && (
        <VerifyIdentitySheet
          title="Verify to link card"
          description="You must verify your identity before linking this card to another person's account"
          onVerified={async (token) => {
            setShowVerify(false);
            setActionToken(token);
            try {
              await createDelegation.mutateAsync({ paymentTypeId: paymentType.id, ownerEmail: email.trim(), _actionToken: token });
              onClose();
            } catch (err) {
              setActionToken(null);
              alert(err?.response?.data?.error || 'Failed to send request');
            }
          }}
          onClose={() => setShowVerify(false)}
        />
      )}
    </div>
  );
}

export default function PaymentTypesPage() {
  const navigate = useNavigate();
  const { t: translate } = useTranslation();
  const { data: types = [], isLoading } = usePaymentTypes();
  const { data: delegations } = useCardDelegations();
  const { data: accounts = [] } = useAccounts();
  const create = useCreatePaymentType();
  const update = useUpdatePaymentType();
  const remove = useDeletePaymentType();

  const [sheet, setSheet] = useState(null); // null | 'new' | paymentType object
  const [delegateSheet, setDelegateSheet] = useState(null); // null | paymentType object

  const allDelegations = [...(delegations?.outgoing || []), ...(delegations?.incoming || [])];
  const getDelegation = (ptId) => allDelegations.find((d) => d.paymentTypeId === ptId);

  const openNew = () => setSheet('new');
  const openEdit = (type) => setSheet(type);
  const closeSheet = () => setSheet(null);

  const handleSave = async (data) => {
    if (sheet === 'new') {
      await create.mutateAsync(data);
    } else {
      await update.mutateAsync({ id: sheet.id, ...data });
    }
    closeSheet();
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopBar title={translate('settings.payment_types')} showBack />

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        {/* Add button */}
        <button
          onClick={openNew}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + {translate('common.add')} {translate('expense.payment_type').toLowerCase()}
        </button>

        {/* List */}
        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading && (
            <p style={{ padding: '24px 16px', fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>
              {translate('common.loading')}
            </p>
          )}
          {!isLoading && types.length === 0 && (
            <p style={{ padding: '24px 16px', fontSize: 13, color: '#B0B8C4', textAlign: 'center' }}>
              No payment types yet
            </p>
          )}
          {types.map((t, idx) => {
            const info = t.cardType === 'CREDIT_CARD' ? dueDateInfo(t.paymentDueDay, t.billingCycleDay) : null;
            const urgency = info
              ? info.days === 0 ? 'red' : info.days <= 3 ? 'orange' : info.days <= 7 ? 'yellow' : 'green'
              : null;
            const delegation = t.cardType === 'CREDIT_CARD' ? getDelegation(t.id) : null;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  gap: 12,
                  background: '#fff',
                  borderRadius: idx === 0 ? '14px 14px 0 0' : idx === types.length - 1 ? '0 0 14px 14px' : 0,
                  borderBottom: idx < types.length - 1 ? '1px solid #F0F2F7' : 'none',
                }}
              >
                {/* Icon box */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#E6FAF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {t.icon || '💰'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }} className="truncate">{t.name}</span>
                    {t.cardType === 'CREDIT_CARD' && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#EEF2FF', color: '#6366F1', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>
                        CREDIT
                      </span>
                    )}
                    {t.cardType === 'DEBIT_CARD' && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#3B82F6', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>
                        DEBIT
                      </span>
                    )}
                  </div>
                  {(t.cardLastFour || t.cardHolderName) && (
                    <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0', fontFamily: 'monospace' }}>
                      {t.cardLastFour ? `•••• ${t.cardLastFour}` : ''}
                      {t.cardHolderName ? `  ${t.cardHolderName}` : ''}
                      {t.cardExpiry ? `  ${t.cardExpiry}` : ''}
                    </p>
                  )}
                  {t.linkedAccount && (
                    <p style={{ fontSize: 11, color: '#00C2B2', margin: '2px 0 0' }}>
                      🔗 Auto-tracks: {t.linkedAccount.name}
                    </p>
                  )}
                  {info && (
                    <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <p style={{
                        fontSize: 11,
                        fontWeight: 600,
                        margin: 0,
                        color: urgency === 'red' ? '#EF4444' : urgency === 'orange' ? '#F97316' : urgency === 'yellow' ? '#CA8A04' : '#B0B8C4',
                      }}>
                        {info.days === 0 ? '⚠️ Due today!' :
                         info.days === 1 ? '⚠️ Due tomorrow' :
                         `Due in ${info.days} days · ${info.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                      {info.cycleText && (
                        <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>Cycle: {info.cycleText}</p>
                      )}
                    </div>
                  )}
                  {delegation && (
                    <p style={{
                      fontSize: 11,
                      fontWeight: 600,
                      margin: '2px 0 0',
                      color: delegation.status === 'ACTIVE' ? '#059669' : delegation.status === 'PENDING' ? '#F59E0B' : '#B0B8C4',
                    }}>
                      {delegation.status === 'ACTIVE' ? `🔗 Linked to ${delegation.owner?.name || 'owner'}` :
                       delegation.status === 'PENDING' ? '⏳ Awaiting owner approval' : ''}
                    </p>
                  )}
                  {t.cardType === 'CREDIT_CARD' && !delegation && (
                    <button
                      onClick={() => setDelegateSheet(t)}
                      style={{ fontSize: 11, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, textAlign: 'left' }}
                    >
                      + Link to card owner
                    </button>
                  )}
                </div>

                {/* Edit / Delete */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => remove.mutate(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </SurfaceCard>
      </div>

      {sheet && (
        <PaymentTypeSheet
          initial={sheet === 'new' ? null : {
            name: sheet.name,
            cardType: sheet.cardType || '',
            billingCycleDay: sheet.billingCycleDay || '',
            paymentDueDay: sheet.paymentDueDay || '',
            reminderDaysBefore: sheet.reminderDaysBefore ?? 3,
            reminderEnabled: sheet.reminderEnabled || false,
            cardLastFour:    sheet.cardLastFour    || '',
            cardHolderName:  sheet.cardHolderName  || '',
            cardExpiry:      sheet.cardExpiry      || '',
            linkedAccountId: sheet.linkedAccountId || '',
          }}
          onSave={handleSave}
          onClose={closeSheet}
          isPending={isPending}
          accounts={accounts}
        />
      )}

      {delegateSheet && (
        <DelegateSheet
          paymentType={delegateSheet}
          onClose={() => setDelegateSheet(null)}
        />
      )}
    </div>
  );
}
