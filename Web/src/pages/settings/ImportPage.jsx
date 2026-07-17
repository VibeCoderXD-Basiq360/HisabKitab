import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';

const FIELD_KEYS = [
  { key: 'date', tKey: 'expense.date', required: true },
  { key: 'amount', tKey: 'expense.amount', required: true },
  { key: 'title', label: 'Title / Description' },
  { key: 'category', tKey: 'expense.category' },
  { key: 'paymentType', label: 'Payment Type' },
  { key: 'note', tKey: 'expense.note' },
];

const HINTS = {
  date: ['date', 'transaction date', 'txn date', 'value date', 'posting date'],
  amount: ['amount', 'debit', 'dr amount', 'withdrawal', 'spent'],
  title: ['title', 'description', 'narration', 'particulars', 'merchant', 'details'],
  category: ['category'],
  paymentType: ['payment type', 'payment method', 'mode', 'payment mode'],
  note: ['note', 'remarks', 'comment', 'reference'],
};

export default function ImportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const FIELDS = FIELD_KEYS.map((f) => ({ ...f, label: f.tKey ? t(f.tKey) : f.label }));
  const [step, setStep] = useState('upload');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', title: '', category: '', paymentType: '', note: '' });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState({ created: 0, skipped: 0 });

  function parseFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const hdrs = meta.fields || [];
        setHeaders(hdrs);
        setRows(data.slice(0, 500));
        const auto = {};
        for (const [key, hints] of Object.entries(HINTS)) {
          const found = hdrs.find((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
          auto[key] = found || '';
        }
        setMapping(auto);
        setStep('map');
      },
      error: () => alert('Could not parse file. Make sure it is a valid CSV.'),
    });
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  const previewRows = rows.slice(0, 5);
  const mappedCount = rows.filter((r) => r[mapping.date] && r[mapping.amount]).length;

  async function handleImport() {
    setImporting(true);
    setImportProgress(10);
    const payload = rows
      .map((row) => ({
        expenseDate: mapping.date ? row[mapping.date] || '' : '',
        amount: mapping.amount ? row[mapping.amount] || '' : '',
        title: mapping.title ? row[mapping.title] || '' : '',
        categoryName: mapping.category ? row[mapping.category] || '' : '',
        paymentTypeName: mapping.paymentType ? row[mapping.paymentType] || '' : '',
        note: mapping.note ? row[mapping.note] || '' : '',
      }))
      .filter((r) => r.amount && r.expenseDate);

    try {
      setImportProgress(40);
      const res = await api.post('/expenses/import', { rows: payload });
      setImportProgress(100);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setResult({ created: res.data.created, skipped: res.data.skipped || 0 });
      setStep('done');
    } catch {
      alert('Import failed. Check your file format and try again.');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  }

  function downloadTemplate() {
    const csv = 'date,amount,title,category,paymentType,note\n2024-01-15,500,Grocery Shopping,Food,Cash,Weekly groceries\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hisabkitab-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.import')} showBack />
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {step === 'upload' && (
          <>
            {/* Info card */}
            <SurfaceCard style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>📂</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>Import expenses from a CSV</p>
                  <p style={{ fontSize: 13, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
                    Works with bank exports, Excel sheets, or any custom CSV
                  </p>
                </div>
              </div>
              <div style={{ background: '#F0F2F7', borderRadius: 10, padding: '10px 12px', marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0D14', margin: 0 }}>Auto-detected columns:</p>
                <p style={{ fontSize: 12, color: '#B0B8C4', margin: '3px 0 0' }}>
                  Date, Amount, Title/Description, Category, Payment Type, Note
                </p>
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>
                  Up to 500 rows per import · Column names are auto-mapped
                </p>
              </div>
            </SurfaceCard>

            {/* Template download */}
            <button
              onClick={downloadTemplate}
              style={{
                width: '100%',
                padding: '11px 0',
                background: '#E6FAF9',
                color: '#009E90',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ⬇ Download template CSV
            </button>

            {/* Drop zone */}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '32px 20px',
                background: dragOver ? '#E6FAF9' : '#F0F2F7',
                border: `2px dashed ${dragOver ? '#00C2B2' : '#E9ECF0'}`,
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: 48 }}>📑</span>
              <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>
                {dragOver ? 'Drop your CSV here' : 'Tap to choose a CSV file'}
              </p>
              <p style={{ fontSize: 13, color: '#B0B8C4', margin: 0 }}>or drag and drop · .csv files only</p>
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
            </label>
          </>
        )}

        {step === 'map' && (
          <>
            {/* Column mapping */}
            <SurfaceCard style={{ padding: 16 }}>
              <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>Map columns</p>
              <p style={{ fontSize: 13, color: '#B0B8C4', margin: '4px 0 12px' }}>
                Match CSV columns to expense fields
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FIELDS.map(({ key, label, required }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', width: 112, flexShrink: 0, lineHeight: 1.3 }}>
                      {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
                    </label>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                      style={{
                        flex: 1,
                        minHeight: 40,
                        padding: '0 12px',
                        borderRadius: 10,
                        border: '1.5px solid #E9ECF0',
                        background: '#F0F2F7',
                        fontSize: 13,
                        color: '#0A0D14',
                        outline: 'none',
                      }}
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <SurfaceCard style={{ padding: 16, overflow: 'hidden' }}>
                <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: '0 0 12px' }}>
                  Preview (first 5 rows)
                </p>
                <div style={{ overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
                  <table style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#fff', borderBottom: '1px solid #E9ECF0' }}>
                        {[t('expense.date'), t('expense.amount'), 'Title', t('expense.category')].map((h) => (
                          <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', fontWeight: 600, color: '#B0B8C4' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E9ECF0' }}>
                          <td style={{ padding: '7px 16px 7px 0', color: '#0A0D14', fontFamily: 'monospace' }}>
                            {mapping.date ? r[mapping.date] : '—'}
                          </td>
                          <td style={{ padding: '7px 16px 7px 0', color: '#0A0D14' }}>
                            {mapping.amount ? r[mapping.amount] : '—'}
                          </td>
                          <td style={{ padding: '7px 16px 7px 0', color: '#0A0D14', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mapping.title ? r[mapping.title] : '—'}
                          </td>
                          <td style={{ padding: '7px 16px 7px 0', color: '#0A0D14' }}>
                            {mapping.category ? r[mapping.category] : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            )}

            <p style={{ fontSize: 12, textAlign: 'center', color: '#B0B8C4', margin: 0 }}>
              {mappedCount} of {rows.length} rows will be imported
            </p>

            {/* Progress bar during import */}
            {importing && (
              <div style={{ padding: '4px 0' }}>
                <ProgressBar value={importProgress} max={100} />
                <p style={{ fontSize: 12, color: '#009E90', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                  Importing…
                </p>
              </div>
            )}

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={importing || !mapping.date || !mapping.amount || mappedCount === 0}
              style={{
                width: '100%',
                padding: '14px 0',
                background: (importing || !mapping.date || !mapping.amount || mappedCount === 0)
                  ? '#B0B8C4'
                  : 'linear-gradient(135deg, #00C2B2, #009E90)',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                border: 'none',
                cursor: (importing || !mapping.date || !mapping.amount || mappedCount === 0) ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {importing ? 'Importing…' : `Import ${mappedCount} expense${mappedCount !== 1 ? 's' : ''}`}
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80, paddingBottom: 32 }}>
            <span style={{ fontSize: 64, color: '#059669' }}>✓</span>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Import complete!</p>
            <p style={{ fontSize: 14, color: '#374151', textAlign: 'center', margin: 0 }}>
              {result.created} expense{result.created !== 1 ? 's' : ''} imported
              {result.skipped > 0 ? ` · ${result.skipped} rows skipped (bad date or amount)` : ''}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => { setStep('upload'); setRows([]); setHeaders([]); }}
                style={{
                  padding: '11px 20px',
                  borderRadius: 12,
                  border: '1.5px solid #E9ECF0',
                  background: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0A0D14',
                  cursor: 'pointer',
                }}
              >
                Import more
              </button>
              <button
                onClick={() => navigate('/home')}
                style={{
                  padding: '11px 20px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #00C2B2, #009E90)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
