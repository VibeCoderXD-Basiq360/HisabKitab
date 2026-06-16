import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExpense, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { usePeople } from '../../hooks/usePeople';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  amount: '',
  title: '',
  note: '',
  expenseDate: todayISO(),
  categoryId: '',
  paymentTypeId: '',
  peopleIds: [],
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
      setForm({
        amount: String(existing.amount),
        title: existing.title || '',
        note: existing.note || '',
        expenseDate: existing.expenseDate.slice(0, 10),
        categoryId: existing.categoryId || '',
        paymentTypeId: existing.paymentTypeId,
        peopleIds: existing.people.map((p) => p.personId),
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
      ...form,
      amount: Number(form.amount),
      categoryId: form.categoryId || null,
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
            <label className="text-sm font-medium text-gray-700">Split with</label>
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
