import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { useExpense, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { usePeople } from '../../hooks/usePeople';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const todayISO = () => new Date().toISOString().slice(0, 10);

function defaultRecurringStart(expenseDateStr, frequency) {
  const base = new Date((expenseDateStr || todayISO()) + 'T09:00');
  let next;
  switch (frequency) {
    case 'DAILY':   next = addDays(base, 1); break;
    case 'WEEKLY':  next = addWeeks(base, 1); break;
    case 'YEARLY':  next = addYears(base, 1); break;
    default:        next = addMonths(base, 1);
  }
  return format(next, "yyyy-MM-dd'T'HH:mm");
}

const FREQ_OPTIONS = [
  { value: 'DAILY',   label: 'Daily' },
  { value: 'WEEKLY',  label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY',  label: 'Yearly' },
];

const EMPTY = {
  amount: '',
  title: '',
  note: '',
  expenseDate: todayISO(),
  categoryId: '',
  paymentTypeId: '',
  peopleIds: [],
  paidForPersonId: '',
  forMode: 'self',
  isRecurring: false,
  frequency: 'MONTHLY',
  recurringStartAt: '',
  recurringEndDate: '',
};

export default function AddEditExpensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing } = useExpense(id);
  const { data: categories = [] } = useCategories();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const { data: people = [] } = usePeople();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (existing) {
      const hasPaidFor = !!existing.paidForPersonId;
      setForm({
        amount: String(existing.amount),
        title: existing.title || '',
        note: existing.note || '',
        expenseDate: existing.expenseDate.slice(0, 10),
        categoryId: existing.categoryId || '',
        paymentTypeId: existing.paymentTypeId,
        peopleIds: hasPaidFor ? [] : existing.people.map((p) => p.personId),
        paidForPersonId: existing.paidForPersonId || '',
        forMode: hasPaidFor ? 'other' : 'self',
      });
    }
  }, [existing]);

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const togglePerson = (personId) => {
    setForm((f) => ({
      ...f,
      peopleIds: f.peopleIds.includes(personId)
        ? f.peopleIds.filter((x) => x !== personId)
        : [...f.peopleIds, personId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      amount: Number(form.amount),
      title: form.title,
      note: form.note,
      expenseDate: form.expenseDate,
      categoryId: form.categoryId || null,
      paymentTypeId: form.paymentTypeId,
      peopleIds: form.forMode === 'other' ? [] : form.peopleIds,
      paidForPersonId: form.forMode === 'other' ? form.paidForPersonId || null : null,
      isRecurring: !isEdit && form.isRecurring,
      frequency: form.frequency,
      recurringStartAt: form.recurringStartAt || null,
      recurringEndDate: form.recurringEndDate || null,
    };
    if (isEdit) {
      await updateExpense.mutateAsync({ id, ...payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    navigate(-1);
  };

  const handleDelete = async () => {
    await deleteExpense.mutateAsync(id);
    navigate('/home', { replace: true });
  };

  const busy = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title={isEdit ? 'Edit Expense' : 'Add Expense'} showBack />

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 flex flex-col gap-4 pb-10">
        <Input
          label="Amount (₹)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={field('amount')}
          required
        />

        <Input
          label="Title (optional)"
          value={form.title}
          onChange={field('title')}
          placeholder="e.g. Lunch, Petrol"
        />

        <Input label="Date" type="date" value={form.expenseDate} onChange={field('expenseDate')} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={form.categoryId}
            onChange={field('categoryId')}
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Payment type *</label>
          <select
            value={form.paymentTypeId}
            onChange={field('paymentTypeId')}
            required
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Select…</option>
            {paymentTypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <Input label="Note" value={form.note} onChange={field('note')} placeholder="Optional note" />

        {people.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">This expense is for</label>
            <div className="flex gap-2">
              {['self', 'other'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setForm((f) => ({ ...f, forMode: mode, paidForPersonId: '', peopleIds: [] }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    form.forMode === mode
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 text-gray-600 bg-white'
                  }`}
                >
                  {mode === 'self' ? 'Myself' : 'Someone else'}
                </button>
              ))}
            </div>

            {form.forMode === 'other' && (
              <>
                <select
                  value={form.paidForPersonId}
                  onChange={field('paidForPersonId')}
                  required={form.forMode === 'other'}
                  className="min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">Select person…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {form.paidForPersonId && Number(form.amount) > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">🧾</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-700">
                        {people.find((p) => p.id === form.paidForPersonId)?.name} owes you ₹{Number(form.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-500">Full amount — they pay you back</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {form.forMode === 'self' && (
              <>
                <label className="text-sm font-medium text-gray-700 mt-1">Split with</label>
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => {
                    const selected = form.peopleIds.includes(p.id);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePerson(p.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selected
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-gray-200 text-gray-600 bg-white'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
                {form.peopleIds.length > 0 && Number(form.amount) > 0 && (
                  <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">⚖️</span>
                    <div>
                      <p className="text-sm font-semibold text-primary-700">
                        ₹{(Number(form.amount) / (form.peopleIds.length + 1)).toFixed(2)} each
                      </p>
                      <p className="text-xs text-primary-500">
                        Split equally · you + {form.peopleIds.length} {form.peopleIds.length === 1 ? 'person' : 'people'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!isEdit && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => {
                const isOn = !f.isRecurring;
                return {
                  ...f,
                  isRecurring: isOn,
                  recurringStartAt: isOn ? defaultRecurringStart(f.expenseDate, f.frequency) : '',
                };
              })}
              className="flex items-center justify-between min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔁</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">Make this recurring</p>
                  <p className="text-xs text-gray-400">Auto-add this expense on a schedule</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isRecurring ? 'bg-primary-500' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            {form.isRecurring && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  {FREQ_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setForm((f) => ({ ...f, frequency: opt.value }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        form.frequency === opt.value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-gray-200 text-gray-600 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">First auto-create on</label>
                    <input
                      type="datetime-local"
                      value={form.recurringStartAt}
                      onChange={field('recurringStartAt')}
                      className="min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-primary-400"
                    />
                    <p className="text-xs text-gray-400">Day & time the first auto-expense gets created</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">End date (optional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={form.recurringEndDate}
                        onChange={field('recurringEndDate')}
                        className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-primary-400"
                      />
                      {form.recurringEndDate && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, recurringEndDate: '' }))}
                          className="text-gray-400 text-lg px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">Leave empty to repeat forever</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
