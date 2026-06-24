import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import api from '../../lib/api';

const now = new Date();

const PERIODS = [
  {
    label: 'This Month',
    filename: format(now, 'MMM-yyyy'),
    params: { fromDate: startOfMonth(now).toISOString(), toDate: endOfMonth(now).toISOString() },
  },
  {
    label: 'Last Month',
    filename: format(subMonths(now, 1), 'MMM-yyyy'),
    params: {
      fromDate: startOfMonth(subMonths(now, 1)).toISOString(),
      toDate: endOfMonth(subMonths(now, 1)).toISOString(),
    },
  },
  {
    label: 'Last 3 Months',
    filename: `${format(subMonths(now, 2), 'MMM')}-${format(now, 'MMM-yyyy')}`,
    params: { fromDate: startOfMonth(subMonths(now, 2)).toISOString(), toDate: endOfMonth(now).toISOString() },
  },
  { label: 'All Time', filename: 'all-time', params: {} },
];

async function fetchAllExpenses(params) {
  const PAGE = 200;
  let page = 1, all = [];
  while (true) {
    const res = await api.get('/expenses', { params: { ...params, page, limit: PAGE } });
    const { data, total } = res.data;
    all = all.concat(data);
    if (all.length >= total || data.length === 0) break;
    page++;
  }
  return all;
}

async function generatePDF(period, expenses, analyticsData) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const accent = [99, 102, 241]; // indigo-500

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('HisabKitab', 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Expense Report', 14, 20);
  doc.text(period.label, W - 14, 12, { align: 'right' });
  doc.text(`Generated ${format(now, 'dd MMM yyyy')}`, W - 14, 20, { align: 'right' });

  let y = 36;
  doc.setTextColor(30, 30, 30);

  // ── Summary cards ────────────────────────────────────────────────────────────
  const total     = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const count     = expenses.length;
  const avgPerTxn = count > 0 ? total / count : 0;

  // Category totals
  const catMap = {};
  for (const e of expenses) {
    const name = e.category?.name || 'Uncategorised';
    catMap[name] = (catMap[name] || 0) + Number(e.amount);
  }
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    { label: 'Total Spent',        value: `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Transactions',       value: String(count) },
    { label: 'Avg per Transaction',value: `₹${avgPerTxn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Top Category',       value: topCat ? topCat[0] : '—' },
  ];

  const cardW = (W - 28 - 9) / 4;
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 140);
    doc.text(c.label.toUpperCase(), x + cardW / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(c.value, x + cardW / 2, y + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });
  y += 26;

  // ── Category breakdown ────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text('Category Breakdown', 14, y);
  y += 4;

  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amt]) => [
      name,
      `₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      `${((amt / total) * 100).toFixed(1)}%`,
    ]);

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Amount', '% of Total']],
    body: catRows,
    theme: 'striped',
    headStyles: { fillColor: accent, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: W - 28,
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Full expense list ─────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text('All Expenses', 14, y);
  y += 4;

  const expRows = expenses.map((e) => [
    format(new Date(e.expenseDate), 'dd MMM yy'),
    e.title,
    e.category?.name || '—',
    e.paymentType?.name || '—',
    `₹${Number(e.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    e.note || '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Title', 'Category', 'Payment', 'Amount', 'Note']],
    body: expRows,
    theme: 'striped',
    headStyles: { fillColor: accent, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 18 },
      4: { halign: 'right', cellWidth: 20 },
      5: { cellWidth: 30, textColor: [140, 140, 140] },
    },
    margin: { left: 14, right: 14 },
    tableWidth: W - 28,
  });

  // ── Footer on every page ──────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`HisabKitab · ${period.label} · Page ${i} of ${totalPages}`, W / 2, 292, { align: 'center' });
  }

  doc.save(`hisabkitab-${period.filename}-${format(now, 'yyyyMMdd')}.pdf`);
}

export default function ExportPage() {
  const { t } = useTranslation();
  const [periodIdx, setPeriodIdx]   = useState(0);
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError]           = useState('');

  async function handleCSV() {
    setCsvLoading(true);
    setError('');
    try {
      const { params, filename } = PERIODS[periodIdx];
      const res = await api.get('/expenses/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `hisabkitab-${filename}-${format(now, 'yyyyMMdd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV download failed. Please try again.');
    } finally {
      setCsvLoading(false);
    }
  }

  async function handlePDF() {
    setPdfLoading(true);
    setError('');
    try {
      const { params } = PERIODS[periodIdx];
      const expenses = await fetchAllExpenses(params);
      if (expenses.length === 0) { setError('No expenses found for this period.'); return; }
      await generatePDF(PERIODS[periodIdx], expenses);
    } catch (err) {
      console.error(err);
      setError('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.export')} showBack />
      <div className="flex-1 pb-8 p-4 space-y-4">

        {/* Period selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select period</p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  periodIdx === i
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* CSV */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">CSV</p>
                <p className="text-xs text-gray-400">Spreadsheet-ready</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Date · Title · Category · Payment · Amount · Note
            </p>
            <button
              onClick={handleCSV}
              disabled={csvLoading}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {csvLoading ? 'Exporting…' : 'Download CSV'}
            </button>
          </div>

          {/* PDF */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">PDF Report</p>
                <p className="text-xs text-gray-400">Formatted report</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Summary · Category breakdown · Full expense list
            </p>
            <button
              onClick={handlePDF}
              disabled={pdfLoading}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {pdfLoading && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              ⏳ Fetching all expenses and building your PDF…
            </p>
            <p className="text-xs text-indigo-500 mt-1">This may take a few seconds for large date ranges.</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
