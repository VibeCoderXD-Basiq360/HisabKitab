import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { useExpense, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { usePeople } from '../../hooks/usePeople';
import { useComments, useAddComment, useDeleteComment, useExpenseTags } from '../../hooks/useComments';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TagInput from '../../components/ui/TagInput';
import { format as dfFormat } from 'date-fns';

const todayISO = () => new Date().toISOString().slice(0, 10);

function nextValidDay(base, allowedDays) {
  let d = addDays(base, 1);
  for (let i = 0; i < 7; i++) {
    if (allowedDays.includes(d.getDay())) return d;
    d = addDays(d, 1);
  }
  return addDays(base, 1);
}

function defaultRecurringStart(expenseDateStr, frequency, customDays = []) {
  const base = new Date((expenseDateStr || todayISO()) + 'T09:00');
  let next;
  switch (frequency) {
    case 'DAILY':       next = addDays(base, 1); break;
    case 'WEEKLY':      next = addWeeks(base, 1); break;
    case 'YEARLY':      next = addYears(base, 1); break;
    case 'WEEKDAYS':    next = nextValidDay(base, [1, 2, 3, 4, 5]); break;
    case 'WEEKENDS':    next = nextValidDay(base, [0, 6]); break;
    case 'CUSTOM_DAYS': next = customDays.length ? nextValidDay(base, customDays) : addDays(base, 1); break;
    default:            next = addMonths(base, 1);
  }
  return format(next, "yyyy-MM-dd'T'HH:mm");
}

const FREQ_OPTIONS_ROW1 = [
  { value: 'DAILY',   label: 'Daily' },
  { value: 'WEEKLY',  label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY',  label: 'Yearly' },
];
const FREQ_OPTIONS_ROW2 = [
  { value: 'WEEKDAYS',    label: 'Weekdays' },
  { value: 'WEEKENDS',    label: 'Weekends' },
  { value: 'CUSTOM_DAYS', label: 'Custom' },
];
const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'JPY', 'MYR', 'CAD', 'AUD'];

const EMPTY = {
  amount: '',
  currency: 'INR',
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
  customDays: [],
  recurringStartAt: '',
  recurringEndDate: '',
  tags: [],
  isReimbursement: false,
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
  const { data: allTags = [] } = useExpenseTags();
  const { data: comments = [] } = useComments(isEdit ? id : null);
  const addComment = useAddComment(id);
  const deleteComment = useDeleteComment(id);
  const [commentText, setCommentText] = useState('');

  const [form, setForm] = useState(EMPTY);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');

  useEffect(() => {
    if (!receiptFile) { setReceiptPreview(''); return; }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice input not supported on this browser.');
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      // Extract amount — digits or simple number words
      const amountMatch = text.match(/(\d+[\d,]*(?:\.\d+)?)/);
      const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '';
      // Match category by name
      const matchedCat = categories.find((c) => text.includes(c.name.toLowerCase()));
      // Match payment type by name
      const matchedPt = paymentTypes.find((p) => text.includes(p.name.toLowerCase()));
      // Title: remove amount + matched names, clean up
      let title = text
        .replace(/(\d+[\d,]*(?:\.\d+)?)/g, '')
        .replace(matchedCat?.name.toLowerCase() || '__NOMATCH__', '')
        .replace(matchedPt?.name.toLowerCase() || '__NOMATCH__', '')
        .replace(/rupees?|rs\.?|inr/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
      setForm((f) => ({
        ...f,
        ...(amount && { amount }),
        ...(title && { title }),
        ...(matchedCat && { categoryId: matchedCat.id }),
        ...(matchedPt && { paymentTypeId: matchedPt.id }),
      }));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

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
        currency: existing.currency || 'INR',
        tags: existing.tags || [],
        isReimbursement: existing.isReimbursement || false,
      });
      setReceiptUrl(existing.receiptUrl || '');
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
      currency: form.currency,
      title: form.title,
      note: form.note,
      expenseDate: form.expenseDate,
      categoryId: form.categoryId || null,
      paymentTypeId: form.paymentTypeId,
      peopleIds: form.forMode === 'other' ? [] : form.peopleIds,
      paidForPersonId: form.forMode === 'other' ? form.paidForPersonId || null : null,
      isRecurring: !isEdit && form.isRecurring,
      frequency: form.frequency,
      customDays: form.customDays,
      recurringStartAt: form.recurringStartAt || null,
      recurringEndDate: form.recurringEndDate || null,
      tags: form.tags,
      isReimbursement: form.isReimbursement,
    };
    let expenseId = id;
    if (isEdit) {
      await updateExpense.mutateAsync({ id, ...payload });
    } else {
      const res = await createExpense.mutateAsync(payload);
      expenseId = res?.id;
    }
    if (receiptFile && expenseId) {
      const fd = new FormData();
      fd.append('image', receiptFile);
      await api.post(`/expenses/${expenseId}/receipt`, fd).catch(() => {});
    }
    navigate(-1);
  };

  const handleDelete = async () => {
    await deleteExpense.mutateAsync(id);
    navigate('/home', { replace: true });
  };

  const busy = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={isEdit ? 'Edit Expense' : 'Add Expense'} showBack />

      {!isEdit && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
              listening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700'
            }`}
          >
            🎤 {listening ? 'Listening… tap to stop' : 'Fill with voice'}
          </button>
        </div>
      )}

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

        {form.currency !== 'INR' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.currency === c
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        {form.currency === 'INR' && (
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, currency: 'USD' }))}
            className="text-xs text-indigo-500 dark:text-indigo-400 text-left -mt-2"
          >
            + Not in INR? Tap to change currency
          </button>
        )}

        <Input
          label="Title (optional)"
          value={form.title}
          onChange={field('title')}
          placeholder="e.g. Lunch, Petrol"
        />

        <Input label="Date" type="date" value={form.expenseDate} onChange={field('expenseDate')} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
          <select
            value={form.categoryId}
            onChange={field('categoryId')}
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment type *</label>
          <select
            value={form.paymentTypeId}
            onChange={field('paymentTypeId')}
            required
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
          <TagInput
            tags={form.tags}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
            suggestions={allTags}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Receipt photo</label>
          {receiptPreview || receiptUrl ? (
            <div className="relative">
              <img
                src={receiptPreview || receiptUrl}
                alt="Receipt"
                className="w-full max-h-52 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => { setReceiptFile(null); setReceiptUrl(''); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm leading-none"
              >
                ✕
              </button>
              <label className="absolute bottom-2 right-2 bg-black/50 text-white rounded-lg px-2 py-1 text-xs cursor-pointer">
                Replace
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary-300 hover:text-primary-600 transition-colors">
              <span className="text-xl">📷</span>
              Attach receipt photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
            </label>
          )}
        </div>

        {people.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">This expense is for</label>
            <div className="flex gap-2">
              {['self', 'other'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setForm((f) => ({ ...f, forMode: mode, paidForPersonId: '', peopleIds: [] }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    form.forMode === mode
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
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
                  className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">Select person…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {form.paidForPersonId && Number(form.amount) > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center gap-3">
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">Split with</label>
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
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
                {form.peopleIds.length > 0 && Number(form.amount) > 0 && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-700 rounded-xl px-4 py-3 flex items-center gap-3">
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
              className="flex items-center justify-between min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🔁</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Make this recurring</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Auto-add this expense on a schedule</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isRecurring ? 'bg-primary-500' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            {form.isRecurring && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    {FREQ_OPTIONS_ROW1.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm((f) => ({
                          ...f,
                          frequency: opt.value,
                          recurringStartAt: defaultRecurringStart(f.expenseDate, opt.value, f.customDays),
                        }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          form.frequency === opt.value
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {FREQ_OPTIONS_ROW2.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setForm((f) => ({
                          ...f,
                          frequency: opt.value,
                          recurringStartAt: defaultRecurringStart(f.expenseDate, opt.value, f.customDays),
                        }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          form.frequency === opt.value
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.frequency === 'CUSTOM_DAYS' && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Repeat on</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAY_OPTIONS.map((d) => {
                        const active = form.customDays.includes(d.value);
                        return (
                          <button
                            type="button"
                            key={d.value}
                            onClick={() => setForm((f) => {
                              const next = active
                                ? f.customDays.filter((x) => x !== d.value)
                                : [...f.customDays, d.value];
                              return {
                                ...f,
                                customDays: next,
                                recurringStartAt: defaultRecurringStart(f.expenseDate, 'CUSTOM_DAYS', next),
                              };
                            })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    {form.customDays.length === 0 && (
                      <p className="text-xs text-red-400">Select at least one day</p>
                    )}
                  </div>
                )}


                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">First auto-create on</label>
                    <input
                      type="datetime-local"
                      value={form.recurringStartAt}
                      onChange={field('recurringStartAt')}
                      className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">Day & time the first auto-expense gets created</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">End date (optional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={form.recurringEndDate}
                        onChange={field('recurringEndDate')}
                        className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                      />
                      {form.recurringEndDate && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, recurringEndDate: '' }))}
                          className="text-gray-400 dark:text-gray-500 text-lg px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Leave empty to repeat forever</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isEdit && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Comments</p>
            {comments.length > 0 && (
              <div className="flex flex-col gap-2">
                {comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{c.userName}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{c.text}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {dfFormat(new Date(c.createdAt), 'd MMM, h:mm a')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate(c.id)}
                      className="text-gray-300 dark:text-gray-600 active:text-red-400 text-sm shrink-0 mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (commentText.trim()) {
                      addComment.mutate(commentText, { onSuccess: () => setCommentText('') });
                    }
                  }
                }}
                placeholder="Add a comment…"
                className="flex-1 min-h-[40px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (commentText.trim()) {
                    addComment.mutate(commentText, { onSuccess: () => setCommentText('') });
                  }
                }}
                disabled={!commentText.trim() || addComment.isPending}
                className="px-3 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {/* Reimbursement toggle */}
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, isReimbursement: !f.isReimbursement }))}
          className={`flex items-center justify-between min-h-[48px] px-4 rounded-xl border transition-colors ${
            form.isReimbursement
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">↩️</span>
            <div className="text-left">
              <p className={`text-sm font-medium ${form.isReimbursement ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                Reimbursement
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Money coming back to you — counts as credit</p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isReimbursement ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isReimbursement ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

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
