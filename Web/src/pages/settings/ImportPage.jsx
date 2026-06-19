import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import TopBar from '../../components/TopBar';

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
  const [result, setResult] = useState({ created: 0, skipped: 0 });

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const previewRows = rows.slice(0, 5);
  const mappedCount = rows.filter((r) => r[mapping.date] && r[mapping.amount]).length;

  async function handleImport() {
    setImporting(true);
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
      const res = await api.post('/expenses/import', { rows: payload });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setResult({ created: res.data.created, skipped: res.data.skipped || 0 });
      setStep('done');
    } catch {
      alert('Import failed. Check your file format and try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.import')} showBack />
      <div className="flex-1 p-4 space-y-4 pb-10">

        {step === 'upload' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5">📂</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Import expenses from a CSV</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Works with bank exports, Excel sheets, or any custom CSV</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Auto-detected columns:</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Date, Amount, Title/Description, Category, Payment Type, Note</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Up to 500 rows per import · Column names are auto-mapped</p>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center gap-3 py-10 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 cursor-pointer active:border-primary-300 transition-colors">
              <span className="text-5xl">📑</span>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Tap to choose a CSV file</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">.csv files only</p>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </>
        )}

        {step === 'map' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <p className="font-semibold text-gray-900 dark:text-white mb-0.5">Map columns</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Match CSV columns to expense fields</p>
              <div className="space-y-2.5">
                {FIELDS.map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0 leading-tight">
                      {label}{required && <span className="text-red-400"> *</span>}
                    </label>
                    <select
                      value={mapping[key]}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                      className="flex-1 min-h-[40px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary-400"
                    >
                      <option value="">— skip —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {previewRows.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">Preview (first 5 rows)</p>
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="text-xs text-gray-700 dark:text-gray-300 w-full min-w-max">
                    <thead>
                      <tr className="text-gray-400 dark:text-gray-500 border-b dark:border-gray-700">
                        {[t('expense.date'), t('expense.amount'), 'Title', t('expense.category')].map((h) => (
                          <th key={h} className="pb-1.5 pr-4 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                          <td className="py-1.5 pr-4 font-mono">{mapping.date ? r[mapping.date] : '—'}</td>
                          <td className="py-1.5 pr-4">{mapping.amount ? r[mapping.amount] : '—'}</td>
                          <td className="py-1.5 pr-4 max-w-[140px] truncate">{mapping.title ? r[mapping.title] : '—'}</td>
                          <td className="py-1.5 pr-4">{mapping.category ? r[mapping.category] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-center text-gray-400">
              {mappedCount} of {rows.length} rows will be imported
            </p>

            <button
              onClick={handleImport}
              disabled={importing || !mapping.date || !mapping.amount || mappedCount === 0}
              className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-40"
            >
              {importing ? 'Importing…' : `Import ${mappedCount} expense${mappedCount !== 1 ? 's' : ''}`}
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center gap-4 pt-20 pb-8">
            <span className="text-6xl">✅</span>
            <p className="text-xl font-bold text-gray-900">Import complete!</p>
            <p className="text-sm text-gray-500 text-center">
              {result.created} expense{result.created !== 1 ? 's' : ''} imported
              {result.skipped > 0 ? ` · ${result.skipped} rows skipped (bad date or amount)` : ''}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setStep('upload'); setRows([]); setHeaders([]); }}
                className="px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Import more
              </button>
              <button
                onClick={() => navigate('/home')}
                className="px-5 py-2.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm"
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
