import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
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

const FORMATS = [
  {
    key: 'csv',
    icon: '📄',
    label: 'CSV',
    desc: 'Spreadsheet-ready',
    columns: 'Date · Title · Category · Payment · Amount · Note',
  },
  {
    key: 'pdf',
    icon: '📊',
    label: 'PDF Report',
    desc: 'Formatted report',
    columns: 'Summary · Category breakdown · Full expense list',
  },
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

async function generatePDF(period, expenses) {
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
    { label: 'Total Spent',         value: `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Transactions',        value: String(count) },
    { label: 'Avg per Transaction', value: `₹${avgPerTxn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
    { label: 'Top Category',        value: topCat ? topCat[0] : '—' },
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

  // ── Category breakdown ───────────────────────────────────────────────────────
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

  // ── Full expense list ────────────────────────────────────────────────────────
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

  // ── Footer on every page ─────────────────────────────────────────────────────
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
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const isLoading = csvLoading || pdfLoading;

  async function handleCSV() {
    setCsvLoading(true);
    setError('');
    setSuccess('');
    try {
      const { params, filename } = PERIODS[periodIdx];
      const res = await api.get('/expenses/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `hisabkitab-${filename}-${format(now, 'yyyyMMdd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('CSV downloaded successfully.');
    } catch {
      setError('CSV download failed. Please try again.');
    } finally {
      setCsvLoading(false);
    }
  }

  async function handlePDF() {
    setPdfLoading(true);
    setError('');
    setSuccess('');
    try {
      const { params } = PERIODS[periodIdx];
      const expenses = await fetchAllExpenses(params);
      if (expenses.length === 0) { setError('No expenses found for this period.'); return; }
      await generatePDF(PERIODS[periodIdx], expenses);
      setSuccess('PDF downloaded successfully.');
    } catch (err) {
      console.error(err);
      setError('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  function handleExport() {
    if (selectedFormat === 'csv') handleCSV();
    else handlePDF();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.export')} showBack />
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Period selector */}
        <SurfaceCard style={{ padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', marginBottom: 10 }}>Select period</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: periodIdx === i ? '#00C2B2' : '#F0F2F7',
                  color: periodIdx === i ? '#fff' : '#0A0D14',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </SurfaceCard>

        {/* Format cards */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>Choose format</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {FORMATS.map((fmt) => {
            const selected = selectedFormat === fmt.key;
            return (
              <SurfaceCard
                key={fmt.key}
                onClick={() => setSelectedFormat(fmt.key)}
                style={{
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  border: selected ? '2px solid #00C2B2' : '2px solid transparent',
                  background: selected ? '#E6FAF9' : undefined,
                  transition: 'border 0.15s, background 0.15s',
                }}
              >
                <span style={{ fontSize: 28 }}>{fmt.icon}</span>
                <div>
                  <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 15, margin: 0 }}>{fmt.label}</p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{fmt.desc}</p>
                </div>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{fmt.columns}</p>
              </SurfaceCard>
            );
          })}
        </div>

        {/* PDF building notice */}
        {pdfLoading && (
          <SurfaceCard style={{ padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#009E90', fontWeight: 600, margin: 0 }}>
              ⏳ Fetching all expenses and building your PDF…
            </p>
            <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
              This may take a few seconds for large date ranges.
            </p>
          </SurfaceCard>
        )}

        {/* Success state */}
        {success && !isLoading && (
          <SurfaceCard style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: '#059669' }}>✓</span>
            <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{success}</p>
          </SurfaceCard>
        )}

        {/* Error state */}
        {error && (
          <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', background: '#FEF2F2', borderRadius: 12, padding: '12px 16px', margin: 0 }}>
            {error}
          </p>
        )}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px 0',
            background: isLoading ? '#B0B8C4' : 'linear-gradient(135deg, #00C2B2, #009E90)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {csvLoading ? 'Exporting…' : pdfLoading ? 'Generating…' : `Download ${selectedFormat.toUpperCase()}`}
        </button>

      </div>
    </div>
  );
}
