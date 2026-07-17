import { useState, useEffect, useRef } from 'react';

const MAX = 50;

function speedColor(ms) {
  if (ms <= 300)  return '#10B981';
  if (ms <= 1000) return '#F59E0B';
  return '#E11D48';
}

function methodColor(method) {
  const map = { GET: '#6366F1', POST: '#00C2B2', PUT: '#F59E0B', PATCH: '#F59E0B', DELETE: '#E11D48' };
  return map[method] || '#B0B8C4';
}

export default function ApiTimingPanel() {
  const [calls, setCalls]       = useState([]);
  const [open, setOpen]         = useState(false);
  const [filter, setFilter]     = useState('');
  const [sortBy, setSortBy]     = useState('time'); // 'time' | 'duration'
  const listRef                 = useRef(null);

  useEffect(() => {
    function handle(e) {
      setCalls(prev => {
        const next = [{ ...e.detail, id: Date.now() + Math.random(), at: new Date() }, ...prev];
        return next.slice(0, MAX);
      });
    }
    window.addEventListener('api:timing', handle);
    return () => window.removeEventListener('api:timing', handle);
  }, []);

  const filtered = calls
    .filter(c => !filter || c.url?.includes(filter) || c.method?.includes(filter.toUpperCase()))
    .sort(sortBy === 'duration' ? (a, b) => b.ms - a.ms : undefined);

  const slowest = calls.length ? Math.max(...calls.map(c => c.ms)) : 0;
  const avgMs   = calls.length ? Math.round(calls.reduce((s, c) => s + c.ms, 0) / calls.length) : 0;

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 12, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
      fontFamily: 'monospace',
    }}>
      {/* Panel */}
      {open && (
        <div style={{
          width: 340, background: '#0F1624', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          maxHeight: '60vh',
        }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00C2B2', flex: 1 }}>API TIMING</span>
            <span style={{ fontSize: 10, color: '#B0B8C4' }}>avg <span style={{ color: speedColor(avgMs) }}>{avgMs}ms</span></span>
            <span style={{ fontSize: 10, color: '#B0B8C4' }}>peak <span style={{ color: speedColor(slowest) }}>{slowest}ms</span></span>
            <button onClick={() => setCalls([])} style={{ fontSize: 10, color: '#B0B8C4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Clear</button>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              placeholder="filter url or method…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8,
                padding: '5px 10px', fontSize: 11, color: '#fff', outline: 'none',
              }}
            />
            <button
              onClick={() => setSortBy(s => s === 'time' ? 'duration' : 'time')}
              style={{
                fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: 'none',
                background: 'rgba(255,255,255,0.1)', color: '#B0B8C4', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {sortBy === 'time' ? '⏱ Recent' : '🐢 Slowest'}
            </button>
          </div>

          {/* List */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#B0B8C4', fontSize: 11, padding: '20px 0' }}>No calls yet</p>
            ) : filtered.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  opacity: c.ok ? 1 : 0.7,
                }}
              >
                {/* Method badge */}
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
                  background: methodColor(c.method) + '22', color: methodColor(c.method),
                  minWidth: 42, textAlign: 'center', flexShrink: 0,
                }}>
                  {c.method}
                </span>

                {/* URL */}
                <span style={{
                  flex: 1, fontSize: 10, color: c.ok ? '#E2E8F0' : '#F87171',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={c.url}>
                  {c.url}
                </span>

                {/* Status */}
                <span style={{
                  fontSize: 10, fontWeight: 700, color: c.status >= 400 ? '#F87171' : '#94A3B8',
                  flexShrink: 0,
                }}>
                  {c.status || 'ERR'}
                </span>

                {/* Duration */}
                <span style={{
                  fontSize: 11, fontWeight: 800, color: speedColor(c.ms),
                  minWidth: 48, textAlign: 'right', flexShrink: 0,
                }}>
                  {c.ms}ms
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[['#10B981', '≤300ms fast'], ['#F59E0B', '≤1s ok'], ['#E11D48', '>1s slow']].map(([color, label]) => (
              <span key={label} style={{ fontSize: 9, color, fontWeight: 600 }}>● {label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 99,
          background: '#0F1624', border: '1px solid rgba(255,255,255,0.12)',
          color: '#00C2B2', fontSize: 11, fontWeight: 800,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ fontSize: 13 }}>⚡</span>
        {calls.length > 0
          ? <span>{calls.length} calls · <span style={{ color: speedColor(slowest) }}>{slowest}ms peak</span></span>
          : <span style={{ color: '#B0B8C4' }}>API</span>}
      </button>
    </div>
  );
}
