import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useUpdateJob } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const STATUS_COLORS = { QUOTED:'bg-gray-100 text-gray-500', IN_PROGRESS:'bg-blue-100 text-blue-600',
  PRINTED:'bg-purple-100 text-purple-600', DELIVERED:'bg-green-100 text-green-600', CANCELLED:'bg-red-100 text-red-400' };
const STATUSES = ['QUOTED','IN_PROGRESS','PRINTED','DELIVERED','CANCELLED'];

export default function JobsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { data: jobs = [], isLoading } = useJobs(filter ? { status: filter } : {});
  const updateJob = useUpdateJob();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Jobs" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4">
        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <button onClick={() => navigate('/business/jobs/new')}
          className="w-full mt-3 py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow">
          🖨️ New Job
        </button>

        <div className="mt-3 space-y-2">
          {isLoading && <p className="text-center text-gray-400 py-10">Loading…</p>}
          {!isLoading && jobs.length === 0 && <p className="text-center text-gray-400 py-10">No jobs found</p>}
          {jobs.map(job => (
            <div key={job.id} onClick={() => navigate(`/business/jobs/${job.id}`)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{job.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {job.customer?.name || '—'} · {job.location?.name} · {new Date(job.orderDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-white">{fmt(job.actualPrice ?? job.suggestedPrice)}</p>
                  {job.profit !== null && (
                    <p className={`text-xs font-semibold ${Number(job.profit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {Number(job.profit) >= 0 ? '+' : ''}{fmt(job.profit)} profit
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[job.status]}`}>{job.status}</span>
                <p className="text-xs text-gray-400">True cost: {fmt(job.trueCost)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
