import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePaymentTypes,
  useCreatePaymentType,
  useUpdatePaymentType,
  useDeletePaymentType,
} from '../../hooks/usePaymentTypes';
import { useCardDelegations, useCreateDelegation } from '../../hooks/useCardDelegation';
import TopBar from '../../components/TopBar';

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);
const REMINDER_OPTIONS = [1, 2, 3, 5, 7, 10];

const EMPTY_FORM = {
  name: '',
  cardType: '',
  billingCycleDay: '',
  paymentDueDay: '',
  reminderDaysBefore: 3,
  reminderEnabled: false,
};

function PaymentTypeSheet({ initial, onSave, onClose, isPending }) {
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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {initial ? 'Edit payment type' : 'New payment type'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={field('name')}
              placeholder="e.g. HDFC Credit Card"
              className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
            />
          </div>

          {/* Card type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
            <div className="flex gap-2">
              {[
                { value: '', label: 'Generic', icon: '💰' },
                { value: 'DEBIT_CARD', label: 'Debit', icon: '💳' },
                { value: 'CREDIT_CARD', label: 'Credit', icon: '🏦' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, cardType: opt.value }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors flex flex-col items-center gap-1 ${
                    form.cardType === opt.value
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credit card fields */}
          {isCC && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 -mb-1">
                Credit Card Details
              </p>

              {/* Billing cycle & due day */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Billing cycle starts
                  </label>
                  <select
                    value={form.billingCycleDay}
                    onChange={field('billingCycleDay')}
                    className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                  >
                    <option value="">Pick day</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Payment due on
                  </label>
                  <select
                    value={form.paymentDueDay}
                    onChange={field('paymentDueDay')}
                    className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                  >
                    <option value="">Pick day</option>
                    {DAY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminders */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Due date reminders</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Push + email before due date</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reminderEnabled: !f.reminderEnabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.reminderEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {form.reminderEnabled && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Remind me this many days before due date
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {REMINDER_OPTIONS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setForm((f) => ({ ...f, reminderDaysBefore: d }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          Number(form.reminderDaysBefore) === d
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                        }`}
                      >
                        {d} day{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    You'll also get a reminder on the due day itself.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={!form.name.trim() || isPending}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50 mt-1"
          >
            {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add payment type'}
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
  const [email, setEmail] = useState('');
  const createDelegation = useCreateDelegation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await createDelegation.mutateAsync({ paymentTypeId: paymentType.id, ownerEmail: email.trim() });
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Link {paymentType.name} to card owner</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Expenses on this card will be logged by you but the owner will be notified. You can mark specific ones as "to repay."
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Card owner's email (must have HisabKitab account)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dad@email.com"
              className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
            />
          </div>
          <button
            type="submit"
            disabled={!email.trim() || createDelegation.isPending}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
          >
            {createDelegation.isPending ? 'Sending request…' : 'Send delegation request'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PaymentTypesPage() {
  const navigate = useNavigate();
  const { data: types = [], isLoading } = usePaymentTypes();
  const { data: delegations } = useCardDelegations();
  const create = useCreatePaymentType();
  const update = useUpdatePaymentType();
  const remove = useDeletePaymentType();

  const [sheet, setSheet] = useState(null); // null | 'new' | paymentType object
  const [delegateSheet, setDelegateSheet] = useState(null); // null | paymentType object

  const allDelegations = [...(delegations?.outgoing || []), ...(delegations?.incoming || [])];
  const getDelegation = (ptId) => allDelegations.find((d) => d.paymentTypeId === ptId);

  const openNew = () => setSheet('new');
  const openEdit = (t) => setSheet(t);
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Payment Types" showBack />
      <div className="flex-1 p-4 flex flex-col gap-4">
        <button
          onClick={openNew}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800"
        >
          + Add payment type
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {isLoading && <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>}
          {!isLoading && types.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No payment types yet</p>
          )}
          {types.map((t) => {
            const info = t.cardType === 'CREDIT_CARD' ? dueDateInfo(t.paymentDueDay, t.billingCycleDay) : null;
            const urgency = info
              ? info.days === 0 ? 'red' : info.days <= 3 ? 'orange' : info.days <= 7 ? 'yellow' : 'green'
              : null;
            const delegation = t.cardType === 'CREDIT_CARD' ? getDelegation(t.id) : null;
            return (
              <div key={t.id} className="flex items-start px-4 py-3 gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5"
                  style={{ backgroundColor: t.color ? `${t.color}25` : '#f3f4f6' }}
                >
                  {t.icon || '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.name}</span>
                    {t.cardType === 'CREDIT_CARD' && (
                      <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full shrink-0">
                        CREDIT
                      </span>
                    )}
                    {t.cardType === 'DEBIT_CARD' && (
                      <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">
                        DEBIT
                      </span>
                    )}
                  </div>
                  {info && (
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      <p className={`text-xs font-medium ${
                        urgency === 'red' ? 'text-red-500' :
                        urgency === 'orange' ? 'text-orange-500' :
                        urgency === 'yellow' ? 'text-yellow-600' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {info.days === 0 ? '⚠️ Due today!' :
                         info.days === 1 ? '⚠️ Due tomorrow' :
                         `Due in ${info.days} days · ${info.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                      {info.cycleText && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Cycle: {info.cycleText}</p>
                      )}
                    </div>
                  )}
                  {delegation && (
                    <p className={`text-xs font-medium mt-0.5 ${
                      delegation.status === 'ACTIVE' ? 'text-green-600' :
                      delegation.status === 'PENDING' ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {delegation.status === 'ACTIVE' ? `🔗 Linked to ${delegation.owner?.name || 'owner'}` :
                       delegation.status === 'PENDING' ? '⏳ Awaiting owner approval' : ''}
                    </p>
                  )}
                  {t.cardType === 'CREDIT_CARD' && !delegation && (
                    <button
                      onClick={() => setDelegateSheet(t)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 text-left"
                    >
                      + Link to card owner
                    </button>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove.mutate(t.id)}
                    className="text-xs text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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
          }}
          onSave={handleSave}
          onClose={closeSheet}
          isPending={isPending}
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
