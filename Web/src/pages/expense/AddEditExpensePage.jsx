import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { useExpense, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../../hooks/useExpenses';
import { useCategories } from '../../hooks/useCategories';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
import { usePeople } from '../../hooks/usePeople';
import { useCardDelegations } from '../../hooks/useCardDelegation';
import { useComments, useAddComment, useDeleteComment, useExpenseTags } from '../../hooks/useComments';
import { useCreateTemplate } from '../../hooks/useTemplates';
import { useSharedTabs } from '../../hooks/useSharedTabs';
import { useAccounts } from '../../hooks/useAccounts';
import { useOCR } from '../../hooks/useOCR';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
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
  { value: 'DAILY',   tKey: 'expense.freq_daily' },
  { value: 'WEEKLY',  tKey: 'expense.freq_weekly' },
  { value: 'MONTHLY', tKey: 'expense.freq_monthly' },
  { value: 'YEARLY',  tKey: 'expense.freq_yearly' },
];
const FREQ_OPTIONS_ROW2 = [
  { value: 'WEEKDAYS',    tKey: 'expense.freq_weekdays' },
  { value: 'WEEKENDS',    tKey: 'expense.freq_weekends' },
  { value: 'CUSTOM_DAYS', tKey: 'expense.freq_custom' },
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
  willRepay: false,
  personalShare: '',
  tabId: '',
  accountId: '',
  items: [], // [{id, name, amount}]
};

export default function AddEditExpensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const { t } = useTranslation();

  const { data: existing } = useExpense(id);
  const { data: categories = [] } = useCategories();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const { data: people = [] } = usePeople();
  const { data: delegationsData } = useCardDelegations();
  const activeDelegations = delegationsData?.outgoing?.filter((d) => d.status === 'ACTIVE') || [];
  const activeDelegation = activeDelegations.find((d) => d.paymentTypeId === form.paymentTypeId);

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: allTags = [] } = useExpenseTags();
  const { data: tabs = [] } = useSharedTabs();
  const activeTabs = tabs.filter((t) => t.status === 'ACTIVE');
  const { data: accounts = [] } = useAccounts();
  const { data: comments = [] } = useComments(isEdit ? id : null);
  const addComment = useAddComment(id);
  const deleteComment = useDeleteComment(id);
  const [commentText, setCommentText] = useState('');

  const [form, setForm] = useState(() => {
    const tmpl = location.state?.template;
    if (!tmpl) return EMPTY;
    return {
      ...EMPTY,
      title: tmpl.title || '',
      amount: tmpl.amount != null ? String(Number(tmpl.amount)) : '',
      categoryId: tmpl.categoryId || '',
      paymentTypeId: tmpl.paymentTypeId || '',
      note: tmpl.note || '',
    };
  });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateEmoji, setTemplateEmoji] = useState('');
  const createTemplate = useCreateTemplate();
  const { scan, isScanning, error: ocrError, clearError: clearOcrError } = useOCR();
  const { isOnline, enqueue } = useOfflineQueue();
  const [ocrToast, setOcrToast] = useState('');
  const [dismissedDuplicate, setDismissedDuplicate] = useState(false);
  const qc = useQueryClient();
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

  // Duplicate detection — scan all cached expense lists, no extra network call
  const possibleDuplicate = useMemo(() => {
    if (isEdit || !form.amount || !form.categoryId || dismissedDuplicate) return null;
    const amt = Number(form.amount);
    if (!amt) return null;
    const selectedMs = new Date(form.expenseDate + 'T00:00').getTime();
    const windowMs   = 24 * 60 * 60 * 1000;
    for (const [, cached] of qc.getQueriesData({ queryKey: ['expenses'] })) {
      const list = Array.isArray(cached) ? cached : cached?.data;
      if (!Array.isArray(list)) continue;
      const match = list.find((e) =>
        !e.isReimbursement &&
        e.categoryId === form.categoryId &&
        Math.abs(Number(e.amount) - amt) < 0.01 &&
        Math.abs(new Date(e.expenseDate).getTime() - selectedMs) <= windowMs
      );
      if (match) return match;
    }
    return null;
  }, [form.amount, form.categoryId, form.expenseDate, isEdit, dismissedDuplicate, qc]);

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert(t('expense.voice_unsupported'));
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

  async function handleScanReceipt() {
    if (!receiptFile) return;
    const result = await scan(receiptFile);
    if (!result) return;

    // Map categoryHint to actual category id (fuzzy match on name)
    const HINT_KEYWORDS = {
      food:          ['food', 'restaurant', 'dining', 'cafe', 'grocery', 'meal'],
      transport:     ['transport', 'travel', 'uber', 'ola', 'cab', 'taxi', 'auto', 'fuel', 'petrol'],
      shopping:      ['shopping', 'clothing', 'retail', 'store', 'market'],
      entertainment: ['entertainment', 'movie', 'cinema', 'game', 'sport'],
      utilities:     ['utilities', 'electricity', 'water', 'internet', 'bill'],
      health:        ['health', 'medical', 'pharmacy', 'doctor', 'hospital'],
      travel:        ['travel', 'hotel', 'flight', 'ticket'],
    };
    const hint = result.categoryHint?.toLowerCase();
    let matchedCatId = '';
    if (hint) {
      const keywords = HINT_KEYWORDS[hint] || [hint];
      const match = categories.find((c) =>
        keywords.some((kw) => c.name.toLowerCase().includes(kw))
      );
      if (match) matchedCatId = match.id;
    }

    setForm((f) => ({
      ...f,
      ...(result.title  && !f.title  ? { title:  result.title }                  : {}),
      ...(result.amount && !f.amount ? { amount: String(result.amount) }          : {}),
      ...(result.date   && !f.expenseDate ? { expenseDate: result.date }          : {}),
      ...(matchedCatId  && !f.categoryId  ? { categoryId: matchedCatId }          : {}),
      ...(result.note   && !f.note   ? { note: result.note }                      : {}),
    }));

    const filled = [result.title, result.amount, result.date, matchedCatId].filter(Boolean).length;
    setOcrToast(filled > 0 ? `✓ Filled ${filled} field${filled > 1 ? 's' : ''} from receipt` : 'Receipt scanned — no data extracted');
    setTimeout(() => setOcrToast(''), 3000);
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
        accountId: existing.accountId || '',
        items: (existing.items || []).map((it) => ({ id: it.id, name: it.name, amount: String(it.amount) })),
      });
      setReceiptUrl(existing.receiptUrl || '');
    }
  }, [existing]);

  const field = (key) => (e) => {
    if (key === 'amount' || key === 'categoryId') setDismissedDuplicate(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

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
      splitAmount: (() => {
        if (form.forMode !== 'self' || !form.peopleIds.length || !form.personalShare) return undefined;
        const ps = Number(form.personalShare);
        const total = Number(form.amount);
        const n = form.peopleIds.length + 1;
        if (!ps || ps <= 0 || ps >= total) return undefined;
        return Math.round(((total - ps) / n) * 100) / 100;
      })(),
      isRecurring: !isEdit && form.isRecurring,
      frequency: form.frequency,
      customDays: form.customDays,
      recurringStartAt: form.recurringStartAt || null,
      recurringEndDate: form.recurringEndDate || null,
      tags: form.tags,
      isReimbursement: form.isReimbursement,
      willRepay: activeDelegation ? form.willRepay : false,
      tabId: form.tabId || undefined,
      accountId: form.accountId || undefined,
      items: form.items.length > 0
        ? form.items.map((it, i) => ({ name: it.name, amount: Number(it.amount), order: i }))
        : undefined,
    };
    let expenseId = id;
    if (isEdit) {
      await updateExpense.mutateAsync({ id, ...payload });
    } else if (!isOnline) {
      // Offline — queue the expense for later sync
      enqueue(payload);
      navigate(-1);
      return;
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
      <TopBar title={isEdit ? t('expense.edit_title') : t('expense.add_title')} showBack />

      {isEdit && (existing?.tabEntry?.tab || existing?.tabSettlement?.tab) && (() => {
        const tab = existing.tabEntry?.tab || existing.tabSettlement?.tab;
        const isSettlement = !!existing.tabSettlement?.tab;
        return (
          <div className="px-4 pt-3">
            <div className="flex items-start gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-2xl p-3">
              <span className="text-lg shrink-0">🤝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                  {isSettlement
                    ? `Settlement reimbursement from "${tab.name}"`
                    : `Auto-logged from "${tab.name}" tab`}
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                  {isSettlement
                    ? 'This reimbursement was created when a settlement was recorded. Remove the settlement from the tab to delete it.'
                    : 'This expense was created automatically. To remove it, delete the entry from the tab.'}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/tabs/${tab.id}`)}
                  className="mt-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 underline underline-offset-2"
                >
                  Go to tab →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
            🎤 {listening ? t('expense.voice_listen') : t('expense.voice_fill')}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 flex flex-col gap-4 pb-10">
        {/* Amount — computed from items if itemized, manual otherwise */}
        {form.items.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.amount')}</label>
            <div className="min-h-[48px] px-4 flex items-center rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                ₹{form.items.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span className="ml-2 text-xs text-gray-400">auto from {form.items.length} items</span>
            </div>
          </div>
        ) : (
          <Input
            label={t('expense.amount')}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={field('amount')}
            required={form.items.length === 0}
          />
        )}

        {/* Itemized breakdown */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (form.items.length > 0) {
                if (window.confirm('Remove all items and switch to manual amount?'))
                  setForm((f) => ({ ...f, items: [] }));
              } else {
                setForm((f) => ({
                  ...f,
                  items: [{ id: `new-${Date.now()}`, name: '', amount: '' }],
                }));
              }
            }}
            className={`flex items-center justify-between min-h-[44px] px-4 rounded-xl border transition-colors ${
              form.items.length > 0
                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🧾</span>
              <span className={`text-sm font-medium ${form.items.length > 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {form.items.length > 0 ? `Itemized (${form.items.length} items)` : 'Add itemized breakdown'}
              </span>
            </div>
            {form.items.length > 0 && <span className="text-xs text-indigo-400">tap to remove</span>}
          </button>

          {form.items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              {form.items.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-2 px-3 py-2 ${idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <span className="text-xs text-gray-300 dark:text-gray-600 w-4 shrink-0">{idx + 1}</span>
                  <input
                    value={item.name}
                    onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) }))}
                    placeholder="Item name"
                    className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600"
                  />
                  <span className="text-xs text-gray-300 dark:text-gray-600">₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.amount}
                    onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, amount: e.target.value } : it) }))}
                    placeholder="0"
                    className="w-20 text-sm text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-300 text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, { id: `new-${Date.now()}-${f.items.length}`, name: '', amount: '' }] }))}
                className="w-full text-xs text-primary-500 font-semibold py-2.5 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                + Add item
              </button>
            </div>
          )}
        </div>

        {form.currency !== 'INR' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.currency')}</label>
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
            + {t('expense.currency_hint')}
          </button>
        )}

        <Input
          label={t('expense.title_label')}
          value={form.title}
          onChange={field('title')}
          placeholder={t('expense.title_placeholder')}
        />

        <Input label={t('expense.date')} type="date" value={form.expenseDate} onChange={field('expenseDate')} required />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.category')}</label>
          <select
            value={form.categoryId}
            onChange={field('categoryId')}
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">{t('expense.no_category')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.payment_type')} *</label>
          <select
            value={form.paymentTypeId}
            onChange={(e) => {
              const ptId = e.target.value;
              const pt = paymentTypes.find((p) => p.id === ptId);
              setForm((f) => ({
                ...f,
                paymentTypeId: ptId,
                accountId: pt?.linkedAccountId || '',
              }));
            }}
            required
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">{t('expense.select')}</option>
            {paymentTypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {accounts.length > 0 && (() => {
          const linkedPt = paymentTypes.find((p) => p.id === form.paymentTypeId);
          const isAutoLinked = linkedPt?.linkedAccountId && form.accountId === linkedPt.linkedAccountId;
          const linkedAcct = isAutoLinked ? accounts.find((a) => a.id === form.accountId) : null;
          return isAutoLinked ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
              <span className="text-primary-600 dark:text-primary-400 text-sm">🔗</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary-700 dark:text-primary-300">Auto-linked to {linkedAcct?.name}</p>
                <p className="text-xs text-primary-500 dark:text-primary-400">Balance: ₹{Number(linkedAcct?.balance || 0).toLocaleString('en-IN')}</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, accountId: '' }))}
                className="text-xs text-primary-500 dark:text-primary-400 underline shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">🏦 Deduct from Account <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <select
                value={form.accountId}
                onChange={field('accountId')}
                className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — ₹{Number(a.balance).toLocaleString('en-IN')}</option>
                ))}
              </select>
            </div>
          );
        })()}

        <Input label={t('expense.note')} value={form.note} onChange={field('note')} placeholder={t('expense.note_placeholder')} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.tags')}</label>
          <TagInput
            tags={form.tags}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
            suggestions={allTags}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.receipt')}</label>
            {receiptFile && !isEdit && (
              <button
                type="button"
                onClick={handleScanReceipt}
                disabled={isScanning}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg disabled:opacity-60 transition-colors"
              >
                {isScanning ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>🔍 Scan & Fill</>
                )}
              </button>
            )}
          </div>
          {receiptPreview || receiptUrl ? (
            <div className="relative">
              <img
                src={receiptPreview || receiptUrl}
                alt={t('expense.receipt')}
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
                {t('expense.replace')}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:border-primary-300 hover:text-primary-600 transition-colors">
              <span className="text-xl">📷</span>
              {t('expense.attach_receipt')}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
            </label>
          )}
          {ocrError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              ⚠ {ocrError}
              <button type="button" onClick={clearOcrError} className="underline">Dismiss</button>
            </p>
          )}
        </div>

        {people.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.for')}</label>
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
                  {mode === 'self' ? t('expense.myself') : t('expense.someone_else')}
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
                  <option value="">{t('expense.select_person')}</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {form.paidForPersonId && Number(form.amount) > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">🧾</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-700">
                        {t('expense.owes_you', { name: people.find((p) => p.id === form.paidForPersonId)?.name, amount: Number(form.amount).toFixed(2) })}
                      </p>
                      <p className="text-xs text-amber-500">{t('expense.owes_full')}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {form.forMode === 'self' && (
              <>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{t('expense.split_with')}</label>
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
                {form.peopleIds.length > 0 && Number(form.amount) > 0 && (() => {
                  const total = Number(form.amount);
                  const n = form.peopleIds.length + 1;
                  const ps = Number(form.personalShare);
                  const isCustom = form.personalShare !== '' && ps > 0 && ps < total;
                  const myShare = isCustom ? ps : total / n;
                  const theirShare = isCustom ? (total - ps) / n : total / n;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 shrink-0">{t('expense.my_share', 'My share (optional)')}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={`${(total / n).toFixed(2)}`}
                          value={form.personalShare}
                          onChange={(e) => setForm((f) => ({ ...f, personalShare: e.target.value }))}
                          className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      </div>
                      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-700 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-lg">⚖️</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-primary-700">
                            {isCustom
                              ? `You: ₹${myShare.toFixed(2)} · Each of them: ₹${theirShare.toFixed(2)}`
                              : t('expense.split_each', { amount: (total / n).toFixed(2) })}
                          </p>
                          <p className="text-xs text-primary-500">
                            {form.peopleIds.length === 1
                              ? t('expense.split_with_one', { n: form.peopleIds.length })
                              : t('expense.split_with_many', { n: form.peopleIds.length })}
                            {isCustom && ' · custom split'}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Link to Shared Tab — shown only when there's a split person and active tabs exist */}
        {!isEdit && activeTabs.length > 0 && ((form.forMode === 'other' && form.paidForPersonId) || (form.forMode === 'self' && form.peopleIds.length > 0)) && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">🤝 Link to Shared Tab <span className="text-xs font-normal text-gray-400">(optional)</span></label>
            <select
              value={form.tabId}
              onChange={(e) => setForm((f) => ({ ...f, tabId: e.target.value }))}
              className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Don't link to a tab</option>
              {activeTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.name}</option>
              ))}
            </select>
            {form.tabId && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-700 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-lg">🤝</span>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  This expense will appear in the tab and update the shared balance automatically.
                </p>
              </div>
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
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('expense.make_recurring')}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.recurring_desc')}</p>
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
                        {t(opt.tKey)}
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
                        {t(opt.tKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {form.frequency === 'CUSTOM_DAYS' && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.repeat_on')}</p>
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
                      <p className="text-xs text-red-400">{t('expense.select_day')}</p>
                    )}
                  </div>
                )}


                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.first_on')}</label>
                    <input
                      type="datetime-local"
                      value={form.recurringStartAt}
                      onChange={field('recurringStartAt')}
                      className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.first_on')}</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.end_date')}</label>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.end_date_hint')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isEdit && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('expense.comments')}</p>
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
                placeholder={t('expense.comment_placeholder')}
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
                {t('expense.post')}
              </button>
            </div>
          </div>
        )}

        {/* Delegated card banner + willRepay toggle */}
        {activeDelegation && !isEdit && (
          <div className="flex flex-col gap-2">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-xl shrink-0">🏦</span>
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  {t('expense.delegated_card', { name: activeDelegation.owner?.name || 'Card owner' })}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  {t('expense.delegated_info')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, willRepay: !f.willRepay }))}
              className={`flex items-center justify-between min-h-[48px] px-4 rounded-xl border transition-colors ${
                form.willRepay
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">💸</span>
                <div className="text-left">
                  <p className={`text-sm font-medium ${form.willRepay ? 'text-orange-700 dark:text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {t('expense.will_repay')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.will_repay_info', { name: activeDelegation.owner?.name || 'the owner' })}</p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.willRepay ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.willRepay ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
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
                {t('expense.reimbursement')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.reimbursement_info')}</p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${form.isReimbursement ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isReimbursement ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Offline banner */}
        {!isOnline && !isEdit && (
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3">
            <span className="text-lg">📵</span>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You're offline</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Expense will be saved locally and synced when you reconnect.</p>
            </div>
          </div>
        )}

        {/* Duplicate warning banner */}
        {possibleDuplicate && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Possible duplicate</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                "{possibleDuplicate.title}" · ₹{Number(possibleDuplicate.amount).toLocaleString('en-IN')} was added{' '}
                {new Date(possibleDuplicate.expenseDate).toDateString() === new Date(form.expenseDate).toDateString()
                  ? 'today'
                  : 'yesterday'}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissedDuplicate(true)}
              className="text-amber-500 hover:text-amber-700 text-lg leading-none shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? t('common.saving') : isEdit ? t('expense.save_changes') : t('expense.add_expense')}
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>

        {/* Save as template — new expenses only */}
        {!isEdit && form.title && (
          <button
            type="button"
            onClick={() => setShowSaveTemplate(true)}
            className="w-full py-2 text-xs text-gray-400 hover:text-primary-500 transition-colors"
          >
            ⚡ Save as quick-add template
          </button>
        )}
      </form>

      {/* Save as template sheet */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveTemplate(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">⚡ Save as Template</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong>{form.title}</strong>{form.amount ? ` · ₹${Number(form.amount).toLocaleString('en-IN')}` : ''}
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Emoji (optional)</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. ⛽ 🍕 🚌"
                value={templateEmoji}
                onChange={(e) => setTemplateEmoji(e.target.value)}
                maxLength={4}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await createTemplate.mutateAsync({
                    title: form.title,
                    emoji: templateEmoji || null,
                    amount: form.amount ? Number(form.amount) : null,
                    categoryId: form.categoryId || null,
                    paymentTypeId: form.paymentTypeId || null,
                    note: form.note || null,
                  });
                  setShowSaveTemplate(false);
                  setTemplateEmoji('');
                }}
                disabled={createTemplate.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {createTemplate.isPending ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR success toast */}
      {ocrToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {ocrToast}
        </div>
      )}
    </div>
  );
}
