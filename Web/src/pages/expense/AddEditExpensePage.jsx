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
import { useSharedTabs } from '../../hooks/useSharedTabs';
import { useAccounts } from '../../hooks/useAccounts';
import { useOCR } from '../../hooks/useOCR';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import TopBar from '../../components/TopBar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TagInput from '../../components/ui/TagInput';
import { format as dfFormat } from 'date-fns';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import CategoryChip from '../../components/ui/CategoryChip';
import Toggle from '../../components/ui/Toggle';

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
  items: [],
};

// â”€â”€â”€ Shared style constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const S = {
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#B0B8C4',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  },
  input: {
    background: '#F0F2F7',
    borderRadius: 10,
    padding: '10px 12px',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#0A0D14',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: '#F0F2F7',
    borderRadius: 10,
    padding: '10px 12px',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#0A0D14',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 44,
    appearance: 'none',
    WebkitAppearance: 'none',
  },
  freqBtn: (active) => ({
    flex: 1,
    padding: '8px 4px',
    borderRadius: 10,
    border: `1.5px solid ${active ? '#00C2B2' : '#E9ECF0'}`,
    background: active ? '#E6FAF9' : '#fff',
    color: active ? '#009E90' : '#374151',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }),
  toggleRow: (active, activeColor = '#E6FAF9', activeBorder = '#00C2B2') => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1.5px solid ${active ? activeBorder : '#E9ECF0'}`,
    background: active ? activeColor : '#fff',
    cursor: 'pointer',
  }),
  personChip: (selected) => ({
    padding: '8px 14px',
    borderRadius: 20,
    border: `1.5px solid ${selected ? '#00C2B2' : '#E9ECF0'}`,
    background: selected ? '#E6FAF9' : '#fff',
    color: selected ? '#009E90' : '#374151',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }),
};

export default function AddEditExpensePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const isNew = !id;
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

  const [form, setForm] = useState(EMPTY);
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

  const [showAllCats, setShowAllCats] = useState(false);

  useEffect(() => {
    if (!receiptFile) { setReceiptPreview(''); return; }
    const url = URL.createObjectURL(receiptFile);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  // Duplicate detection â€” scan all cached expense lists, no extra network call
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
      const amountMatch = text.match(/(\d+[\d,]*(?:\.\d+)?)/);
      const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '';
      const matchedCat = categories.find((c) => text.includes(c.name.toLowerCase()));
      const matchedPt = paymentTypes.find((p) => text.includes(p.name.toLowerCase()));
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
      if (amount && isNew) setAmountStr(amount);
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

    if (result.amount && isNew) setAmountStr(String(result.amount));

    const filled = [result.title, result.amount, result.date, matchedCatId].filter(Boolean).length;
    setOcrToast(filled > 0 ? `âœ“ Filled ${filled} field${filled > 1 ? 's' : ''} from receipt` : 'Receipt scanned â€” no data extracted');
    setTimeout(() => setOcrToast(''), 3000);
  }

  // Default accountId to first savings/current account for new expenses
  useEffect(() => {
    if (!isEdit && accounts.length > 0) {
      setForm((f) => {
        if (f.accountId) return f;
        const defaultAcc = accounts.find((a) => a.type === 'SAVINGS' || a.type === 'CURRENT') || accounts.find((a) => a.type !== 'CREDIT_CARD');
        return defaultAcc ? { ...f, accountId: defaultAcc.id } : f;
      });
    }
  }, [accounts, isEdit]);

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

  // â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#F0F2F7' }}>
      <TopBar
        title={isNew ? t('expense.add_title') : t('expense.edit_title')}
        showBack
        actions={isNew ? [
          {
            icon: (
              <button
                type="button"
                onClick={() => document.getElementById('receipt-upload-main').click()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, color: '#374151' }}
                title="Attach receipt"
              >📷</button>
            ),
          },
          {
            icon: (
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                style={{
                  background: listening ? 'rgba(225,29,72,0.1)' : 'rgba(0,194,178,0.1)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontSize: 18, padding: '4px 6px',
                  color: listening ? '#E11D48' : '#009E90',
                }}
                title={listening ? 'Stop' : 'Voice fill'}
              >🎤</button>
            ),
          },
        ] : []}
      />
      <input
        id="receipt-upload-main"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Tab-linked banner */}
        {(existing?.tabEntry?.tab || existing?.tabSettlement?.tab) && (() => {
          const tab = existing.tabEntry?.tab || existing.tabSettlement?.tab;
          const isSettlement = !!existing.tabSettlement?.tab;
          return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#E6FAF9', border: '1.5px solid #00C2B2', borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>ðŸ¤</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#009E90', margin: 0 }}>
                  {isSettlement
                    ? `Settlement reimbursement from "${tab.name}"`
                    : `Auto-logged from "${tab.name}" tab`}
                </p>
                <p style={{ fontSize: 11, color: '#00C2B2', margin: '3px 0 0' }}>
                  {isSettlement
                    ? 'Remove the settlement from the tab to delete it.'
                    : 'To remove it, delete the entry from the tab.'}
                </p>
                <button type="button" onClick={() => navigate(`/tabs/${tab.id}`)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#009E90', textDecoration: 'underline', padding: 0, marginTop: 4, fontFamily: 'inherit' }}>
                  Go to tab â†’
                </button>
              </div>
            </div>
          );
        })()}

        {/* Amount */}
        <SurfaceCard style={{ padding: '16px 18px' }}>
          <p style={S.sectionLabel}>Amount</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#B0B8C4' }}>â‚¹</span>
            {form.items.length > 0 ? (
              <div>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#0A0D14', letterSpacing: '-1px' }}>
                  {form.items.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: 12, color: '#B0B8C4', marginLeft: 8 }}>auto from {form.items.length} items</span>
              </div>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={field('amount')}
                required={form.items.length === 0}
                style={{ fontSize: 36, fontWeight: 800, color: '#0A0D14', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', letterSpacing: '-1px', width: '100%' }}
              />
            )}
          </div>
          {/* Currency selector */}
          {form.currency !== 'INR' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {CURRENCIES.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, currency: c }))}
                  style={{ ...S.personChip(form.currency === c), padding: '5px 10px', fontSize: 11, borderRadius: 8 }}>
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setForm((f) => ({ ...f, currency: 'USD' }))}
              style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '6px 0 0', fontFamily: 'inherit' }}>
              + {t('expense.currency_hint')}
            </button>
          )}
        </SurfaceCard>

        {/* Title, Date, Note */}
        <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={S.sectionLabel}>Title</p>
            <input placeholder={t('expense.title_placeholder')} value={form.title} onChange={field('title')} style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={S.sectionLabel}>Date</p>
              <input type="date" value={form.expenseDate} onChange={field('expenseDate')} required style={S.input} />
            </div>
          </div>
          <div>
            <p style={S.sectionLabel}>Note</p>
            <input placeholder={t('expense.note_placeholder')} value={form.note} onChange={field('note')} style={S.input} />
          </div>
        </SurfaceCard>

        {/* Category */}
        <SurfaceCard style={{ padding: '14px 16px' }}>
          <p style={S.sectionLabel}>{t('expense.category')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {categories.slice(0, showAllCats ? undefined : 10).map((cat) => (
              <CategoryChip
                key={cat.id}
                emoji={cat.icon || ''}
                label={cat.name}
                active={form.categoryId === cat.id}
                bg={cat.color ? cat.color + '22' : '#F3F4F6'}
                onClick={() => {
                  setDismissedDuplicate(false);
                  setForm((f) => ({ ...f, categoryId: f.categoryId === cat.id ? '' : cat.id }));
                }}
              />
            ))}
            {!showAllCats && categories.length > 10 && (
              <button onClick={() => setShowAllCats(true)}
                style={{ width: 64, padding: '10px 4px 8px', borderRadius: 15, background: '#F3F4F6', border: '2.5px solid transparent', cursor: 'pointer', fontSize: 9, fontWeight: 800, color: '#374151', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                More
              </button>
            )}
          </div>
          {/* Fallback select for categories not shown */}
          <select value={form.categoryId} onChange={field('categoryId')} style={{ ...S.select, marginTop: 4 }}>
            <option value="">{t('expense.no_category')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </SurfaceCard>

        {/* Payment type + Account */}
        <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={S.sectionLabel}>{t('expense.payment_type')}</p>
            <select value={form.paymentTypeId} onChange={(e) => {
              const ptId = e.target.value;
              const pt = paymentTypes.find((p) => p.id === ptId);
              setForm((f) => ({ ...f, paymentTypeId: ptId, accountId: pt?.linkedAccountId || '' }));
            }} required style={S.select}>
              <option value="">{t('expense.select')}</option>
              {paymentTypes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {accounts.length > 0 && (() => {
            const linkedPt = paymentTypes.find((p) => p.id === form.paymentTypeId);
            const isAutoLinked = linkedPt?.linkedAccountId && form.accountId === linkedPt.linkedAccountId;
            const linkedAcct = isAutoLinked ? accounts.find((a) => a.id === form.accountId) : null;
            return isAutoLinked ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#E6FAF9', borderRadius: 10 }}>
                <span style={{ fontSize: 14 }}>ðŸ”—</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#009E90', margin: 0 }}>Auto-linked to {linkedAcct?.name}</p>
                  <p style={{ fontSize: 11, color: '#00C2B2', margin: 0 }}>Balance: â‚¹{Number(linkedAcct?.balance || 0).toLocaleString('en-IN')}</p>
                </div>
                <button type="button" onClick={() => setForm((f) => ({ ...f, accountId: '' }))}
                  style={{ fontSize: 11, color: '#009E90', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Remove</button>
              </div>
            ) : (
              <div>
                <p style={S.sectionLabel}>Deduct from Account <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></p>
                <select value={form.accountId} onChange={field('accountId')} style={S.select}>
                  <option value="">No account</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} â€” â‚¹{Number(a.balance).toLocaleString('en-IN')}</option>)}
                </select>
              </div>
            );
          })()}
        </SurfaceCard>

        {/* Tags */}
        <SurfaceCard style={{ padding: '14px 16px' }}>
          <p style={S.sectionLabel}>{t('expense.tags')}</p>
          <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} suggestions={allTags} />
        </SurfaceCard>

        {/* People / split */}
        {people.length > 0 && (
          <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={S.sectionLabel}>{t('expense.for')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['self', 'other'].map((mode) => (
                <button key={mode} type="button"
                  onClick={() => setForm((f) => ({ ...f, forMode: mode, paidForPersonId: '', peopleIds: [] }))}
                  style={{ ...S.personChip(form.forMode === mode), flex: 1, borderRadius: 10 }}>
                  {mode === 'self' ? t('expense.myself') : t('expense.someone_else')}
                </button>
              ))}
            </div>
            {form.forMode === 'other' && (
              <>
                <select value={form.paidForPersonId} onChange={field('paidForPersonId')} required style={S.select}>
                  <option value="">{t('expense.select_person')}</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {form.paidForPersonId && Number(form.amount) > 0 && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>ðŸ§¾</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: 0 }}>
                        {t('expense.owes_you', { name: people.find((p) => p.id === form.paidForPersonId)?.name, amount: Number(form.amount).toFixed(2) })}
                      </p>
                      <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>{t('expense.owes_full')}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            {form.forMode === 'self' && (
              <>
                <p style={S.sectionLabel}>{t('expense.split_with')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {people.map((p) => (
                    <button key={p.id} type="button" onClick={() => togglePerson(p.id)} style={S.personChip(form.peopleIds.includes(p.id))}>
                      {p.name}
                    </button>
                  ))}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#B0B8C4', flexShrink: 0 }}>{t('expense.my_share', 'My share')}</span>
                        <input type="number" min="0" step="0.01"
                          placeholder={`${(total / n).toFixed(2)}`}
                          value={form.personalShare}
                          onChange={(e) => setForm((f) => ({ ...f, personalShare: e.target.value }))}
                          style={{ ...S.input, flex: 1 }} />
                      </div>
                      <div style={{ background: '#E6FAF9', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>âš–ï¸</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#009E90', margin: 0 }}>
                            {isCustom
                              ? `You: â‚¹${myShare.toFixed(2)} Â· Each: â‚¹${theirShare.toFixed(2)}`
                              : t('expense.split_each', { amount: (total / n).toFixed(2) })}
                          </p>
                          <p style={{ fontSize: 11, color: '#00C2B2', margin: 0 }}>
                            {form.peopleIds.length === 1
                              ? t('expense.split_with_one', { n: form.peopleIds.length })
                              : t('expense.split_with_many', { n: form.peopleIds.length })}
                            {isCustom && ' Â· custom'}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </SurfaceCard>
        )}

        {/* Receipt */}
        <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ ...S.sectionLabel, marginBottom: 0 }}>{t('expense.receipt')}</p>
            {receiptFile && (
              <button type="button" onClick={handleScanReceipt} disabled={isScanning}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E6FAF9', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#009E90', fontFamily: 'inherit' }}>
                {isScanning ? (
                  <><span style={{ width: 10, height: 10, border: '2px solid #00C2B2', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Scanningâ€¦</>
                ) : 'ðŸ” Scan & Fill'}
              </button>
            )}
          </div>
          {receiptPreview || receiptUrl ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <img src={receiptPreview || receiptUrl} alt={t('expense.receipt')} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => { setReceiptFile(null); setReceiptUrl(''); }}
                style={{ position: 'absolute', top: 8, right: 8, background: '#E11D48', color: '#fff', border: 'none', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}>âœ•</button>
              <label style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                {t('expense.replace')}
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
              </label>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 12, border: '2px dashed #E9ECF0', fontSize: 13, color: '#B0B8C4', cursor: 'pointer' }}>
              <span style={{ fontSize: 20 }}>ðŸ“·</span>
              {t('expense.attach_receipt')}
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])} />
            </label>
          )}
          {ocrError && (
            <p style={{ fontSize: 11, color: '#E11D48', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              âš  {ocrError}
              <button type="button" onClick={clearOcrError} style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', textDecoration: 'underline', fontSize: 11, fontFamily: 'inherit' }}>Dismiss</button>
            </p>
          )}
        </SurfaceCard>

        {/* Itemized */}
        <SurfaceCard style={{ padding: '14px 16px' }}>
          <button type="button"
            onClick={() => {
              if (form.items.length > 0) {
                if (window.confirm('Remove all items and switch to manual amount?')) setForm((f) => ({ ...f, items: [] }));
              } else {
                setForm((f) => ({ ...f, items: [{ id: `new-${Date.now()}`, name: '', amount: '' }] }));
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', width: '100%' }}>
            <span style={{ fontSize: 18 }}>ðŸ§¾</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: form.items.length > 0 ? '#6366F1' : '#374151', flex: 1, textAlign: 'left' }}>
              {form.items.length > 0 ? `Itemized (${form.items.length} items)` : 'Add itemized breakdown'}
            </span>
            {form.items.length > 0 && <span style={{ fontSize: 11, color: '#B0B8C4' }}>tap to remove</span>}
          </button>
          {form.items.length > 0 && (
            <div style={{ marginTop: 10, background: '#F0F2F7', borderRadius: 10, overflow: 'hidden' }}>
              {form.items.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: idx < form.items.length - 1 ? '1px solid #E9ECF0' : 'none' }}>
                  <span style={{ fontSize: 11, color: '#B0B8C4', width: 16, flexShrink: 0 }}>{idx + 1}</span>
                  <input value={item.name}
                    onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) }))}
                    placeholder="Item name"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0A0D14', fontFamily: 'inherit' }} />
                  <span style={{ fontSize: 12, color: '#B0B8C4' }}>â‚¹</span>
                  <input type="number" inputMode="decimal" value={item.amount}
                    onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, amount: e.target.value } : it) }))}
                    placeholder="0"
                    style={{ width: 72, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0A0D14', fontFamily: 'inherit', textAlign: 'right' }} />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 14, padding: 0, flexShrink: 0 }}>âœ•</button>
                </div>
              ))}
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, { id: `new-${Date.now()}-${f.items.length}`, name: '', amount: '' }] }))}
                style={{ width: '100%', padding: 8, fontSize: 12, color: '#00C2B2', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderTop: '1px solid #E9ECF0' }}>
                + Add item
              </button>
            </div>
          )}
        </SurfaceCard>

        {/* Delegated card + willRepay */}
        {activeDelegation && (
          <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#EEF2FF', border: '1.5px solid #6366F1', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>ðŸ¦</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4338CA', margin: 0 }}>
                  {t('expense.delegated_card', { name: activeDelegation.owner?.name || 'Card owner' })}
                </p>
                <p style={{ fontSize: 11, color: '#6366F1', margin: 0 }}>{t('expense.delegated_info')}</p>
              </div>
            </div>
            <div style={S.toggleRow(form.willRepay, '#FFF7ED', '#F97316')} onClick={() => setForm((f) => ({ ...f, willRepay: !f.willRepay }))}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>ðŸ’¸</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t('expense.will_repay')}</p>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('expense.will_repay_info', { name: activeDelegation.owner?.name || 'the owner' })}</p>
                </div>
              </div>
              <Toggle value={form.willRepay} onChange={(v) => setForm((f) => ({ ...f, willRepay: v }))} />
            </div>
          </SurfaceCard>
        )}

        {/* Reimbursement */}
        <SurfaceCard style={{ padding: '14px 16px' }}>
          <div style={S.toggleRow(form.isReimbursement, '#F0FDF4', '#10B981')} onClick={() => setForm((f) => ({ ...f, isReimbursement: !f.isReimbursement }))}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>â†©ï¸</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t('expense.reimbursement')}</p>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('expense.reimbursement_info')}</p>
              </div>
            </div>
            <Toggle value={form.isReimbursement} onChange={(v) => setForm((f) => ({ ...f, isReimbursement: v }))} />
          </div>
        </SurfaceCard>

        {/* Offline banner */}
        {!isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3F4F6', border: '1.5px solid #E9ECF0', borderRadius: 12, padding: '10px 14px' }}>
            <span>ðŸ“µ</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>You're offline</p>
              <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>Changes will be saved locally and synced when you reconnect.</p>
            </div>
          </div>
        )}

        {/* Duplicate warning */}
        {possibleDuplicate && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFFBEB', border: '1.5px solid #F59E0B', borderRadius: 12, padding: '10px 14px' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>âš ï¸</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>Possible duplicate</p>
              <p style={{ fontSize: 11, color: '#B45309', margin: '2px 0 0' }}>
                "{possibleDuplicate.title}" Â· â‚¹{Number(possibleDuplicate.amount).toLocaleString('en-IN')} was added{' '}
                {new Date(possibleDuplicate.expenseDate).toDateString() === new Date(form.expenseDate).toDateString() ? 'today' : 'yesterday'}.
              </p>
            </div>
            <button type="button" onClick={() => setDismissedDuplicate(true)}
              style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#F59E0B', padding: 0, flexShrink: 0 }}>âœ•</button>
          </div>
        )}

        {/* Recurring — ADD mode only */}
        {isNew && (
          <SurfaceCard style={{ padding: '14px 16px' }}>
            <div style={S.toggleRow(form.isRecurring)} onClick={() => setForm((f) => {
              const isOn = !f.isRecurring;
              return { ...f, isRecurring: isOn, recurringStartAt: isOn ? defaultRecurringStart(f.expenseDate, f.frequency) : '' };
            })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>&#x1F501;</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t('expense.make_recurring')}</p>
                  <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('expense.recurring_desc')}</p>
                </div>
              </div>
              <Toggle value={form.isRecurring} onChange={(v) => setForm((f) => ({ ...f, isRecurring: v, recurringStartAt: v ? defaultRecurringStart(f.expenseDate, f.frequency) : '' }))} />
            </div>
            {form.isRecurring && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {FREQ_OPTIONS_ROW1.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, frequency: opt.value, recurringStartAt: defaultRecurringStart(f.expenseDate, opt.value, f.customDays) }))}
                      style={S.freqBtn(form.frequency === opt.value)}>
                      {t(opt.tKey)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {FREQ_OPTIONS_ROW2.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, frequency: opt.value, recurringStartAt: defaultRecurringStart(f.expenseDate, opt.value, f.customDays) }))}
                      style={S.freqBtn(form.frequency === opt.value)}>
                      {t(opt.tKey)}
                    </button>
                  ))}
                </div>
                {form.frequency === 'CUSTOM_DAYS' && (
                  <div>
                    <p style={{ ...S.sectionLabel, marginBottom: 6 }}>{t('expense.repeat_on')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {DAY_OPTIONS.map((d) => {
                        const active = form.customDays.includes(d.value);
                        return (
                          <button key={d.value} type="button"
                            onClick={() => setForm((f) => {
                              const next = active ? f.customDays.filter((x) => x !== d.value) : [...f.customDays, d.value];
                              return { ...f, customDays: next, recurringStartAt: defaultRecurringStart(f.expenseDate, 'CUSTOM_DAYS', next) };
                            })}
                            style={{ ...S.personChip(active), padding: '6px 10px', fontSize: 12, borderRadius: 8 }}>
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    {form.customDays.length === 0 && <p style={{ fontSize: 11, color: '#E11D48', marginTop: 4 }}>{t('expense.select_day')}</p>}
                  </div>
                )}
                <div style={{ background: '#F0F2F7', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ ...S.sectionLabel, display: 'block' }}>{t('expense.first_on')}</label>
                    <input type="datetime-local" value={form.recurringStartAt} onChange={field('recurringStartAt')} style={S.input} />
                  </div>
                  <div>
                    <label style={{ ...S.sectionLabel, display: 'block' }}>{t('expense.end_date')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="date" value={form.recurringEndDate} onChange={field('recurringEndDate')} style={{ ...S.input, flex: 1 }} />
                      {form.recurringEndDate && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, recurringEndDate: '' }))}
                          style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#B0B8C4' }}>&#x2715;</button>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 4 }}>{t('expense.end_date_hint')}</p>
                  </div>
                </div>
              </div>
            )}
          </SurfaceCard>
        )}


        {/* Comments — EDIT mode only */}
        {isEdit && (
          <SurfaceCard style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={S.sectionLabel}>{t('expense.comments')}</p>
            {comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {comments.map((c) => (
                  <div key={c.id} style={{ background: '#F0F2F7', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: 0 }}>{c.userName}</p>
                      <p style={{ fontSize: 13, color: '#0A0D14', margin: '2px 0' }}>{c.text}</p>
                      <p style={{ fontSize: 10, color: '#B0B8C4', margin: 0 }}>{dfFormat(new Date(c.createdAt), 'd MMM, h:mm a')}</p>
                    </div>
                    <button type="button" onClick={() => deleteComment.mutate(c.id)}
                      style={{ background: 'none', border: 'none', color: '#B0B8C4', fontSize: 14, cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2 }}>&#x2715;</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (commentText.trim()) addComment.mutate(commentText, { onSuccess: () => setCommentText('') });
                  }
                }}
                placeholder={t('expense.comment_placeholder')}
                style={{ ...S.input, flex: 1 }} />
              <button type="button"
                onClick={() => { if (commentText.trim()) addComment.mutate(commentText, { onSuccess: () => setCommentText('') }); }}
                disabled={!commentText.trim() || addComment.isPending}
                style={{ height: 44, padding: '0 16px', borderRadius: 10, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!commentText.trim() || addComment.isPending) ? 0.4 : 1 }}>
                {t('expense.post')}
              </button>
            </div>
          </SurfaceCard>
        )}

        {/* Submit buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleSubmit} disabled={busy}
            style={{ flex: 1, height: 52, borderRadius: 14, background: busy ? '#E9ECF0' : 'linear-gradient(135deg,#00C2B2,#009E90)', color: busy ? '#B0B8C4' : '#fff', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.3px', fontFamily: 'inherit' }}>
            {busy ? t('common.saving') : isNew ? t('expense.add_title') : t('expense.save_changes')}
          </button>
          {isEdit && (
            <button type="button" onClick={handleDelete} disabled={deleteExpense.isPending}
              style={{ height: 52, padding: '0 18px', borderRadius: 14, background: '#FFF1F3', color: '#E11D48', border: '1.5px solid #FCA5A5', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: deleteExpense.isPending ? 0.6 : 1 }}>
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      {/* OCR toast */}
      {ocrToast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: '#0A0D14', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {ocrToast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
