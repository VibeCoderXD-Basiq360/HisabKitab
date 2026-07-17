import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessPL } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import HeroCard from '../../components/ui/HeroCard';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const pct = n => `${Math.round(Number(n) || 0)}%`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

// Bar chart colours
const BAR_REVENUE  = '#059669';
const BAR_EXPENSES = '#E11D48';

// Expense breakdown bar accent colours (cycling)
const CAT_COLORS = ['#00C2B2','#3B82F6','#8B5CF6','#059669','#F59E0B','#E11D48','#EC4899'];

function Row({ label, value, sub, accent, bold }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '9px 0', borderBottom: '1px solid #F0F2F7',
      fontWeight: bold ? 700 : 400,
    }}>
      <span style={{ fontSize: 14, color: sub ? '#B0B8C4' : '#374151', paddingLeft: sub ? 12 : 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: accent || '#0A0D14' }}>{value}</span>
    </div>
  );
}

export default function PLPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: pl, isLoading } = useBusinessPL({ month, year });

  function shift(delta) {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  const netProfit     = Number(pl?.netProfit || 0);
  const isProfit      = netProfit >= 0;
  const heroGradient  = pl
    ? isProfit
      ? 'linear-gradient(140deg,#064E3B 0%,#065F46 55%,#047857 100%)'
      : 'linear-gradient(140deg,#7F1D1D 0%,#991B1B 55%,#B91C1C 100%)'
    : undefined; // HeroCard default navy when no data

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="P&L Report" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Period selector */}
        <SurfaceCard style={{ padding: '10px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#E9ECF0', borderRadius: 12, padding: 4,
          }}>
            <button
              onClick={() => shift(-1)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: '#fff', color: '#374151', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              ‹
            </button>
            <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 15, margin: 0 }}>
              {MONTHS[month - 1]} {year}
            </p>
            <button
              onClick={() => shift(1)}
              disabled={year === now.getFullYear() && month === now.getMonth() + 1}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: '#fff', color: '#374151', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                opacity: (year === now.getFullYear() && month === now.getMonth() + 1) ? 0.4 : 1,
              }}
            >
              ›
            </button>
          </div>
        </SurfaceCard>

        {isLoading && <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>}

        {pl && (
          <>
            {/* Hero P&L summary */}
            <HeroCard style={heroGradient ? { background: heroGradient } : {}}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {isProfit ? 'Net Profit' : 'Net Loss'} · {MONTHS[month - 1]} {year}
              </p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.1 }}>
                {isProfit ? '+' : '-'}{fmt(pl.netProfit)}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Revenue',           value: fmt(pl.revenue),    color: 'rgba(255,255,255,0.9)' },
                  { label: 'Gross Profit',       value: fmt(pl.grossProfit), color: Number(pl.grossProfit) >= 0 ? '#6EE7B7' : '#FCA5A5' },
                  { label: 'Operating Expenses', value: fmt(pl.opExpenses), color: '#FCA5A5' },
                  { label: 'Net Margin',         value: pl.revenue > 0 ? pct((netProfit / Number(pl.revenue)) * 100) : '—', color: isProfit ? '#6EE7B7' : '#FCA5A5' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>{s.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </HeroCard>

            {/* Revenue section */}
            <SurfaceCard style={{ borderLeft: '3px solid #059669', borderRadius: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Revenue</p>
              <Row label="Total Revenue" value={fmt(pl.revenue)} accent="#059669" bold />
              <Row label="Cost of Goods Sold" value={`(${fmt(pl.cogs)})`} accent="#E11D48" sub />
              <div style={{ borderTop: '1px solid #F0F2F7', display: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Gross Profit</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: Number(pl.grossProfit) >= 0 ? '#059669' : '#E11D48' }}>
                  {fmt(pl.grossProfit)}
                </span>
              </div>
            </SurfaceCard>

            {/* Expenses section */}
            <SurfaceCard style={{ borderLeft: '3px solid #E11D48', borderRadius: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Expenses</p>
              <Row label="Operating Expenses" value={`(${fmt(pl.opExpenses)})`} accent="#E11D48" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Net Profit / Loss</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isProfit ? '#059669' : '#E11D48' }}>
                  {isProfit ? '+' : '-'}{fmt(pl.netProfit)}
                </span>
              </div>
            </SurfaceCard>

            {/* Job Stats */}
            <SurfaceCard>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Job Stats</p>
              <Row label="Total jobs"   value={pl.jobCount || 0} />
              <Row label="Avg. charged" value={fmt(pl.avgChargedPrice)} />
              <Row label="Avg. margin"  value={pct(pl.avgMarginPct)} />
            </SurfaceCard>

            {/* Cost breakdown */}
            {pl.costBreakdown && pl.costBreakdown.length > 0 && (
              <SurfaceCard>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Expense Breakdown</p>
                {pl.costBreakdown.map((cat, i) => {
                  const total = pl.costBreakdown.reduce((s, c) => s + Number(c.amount), 0);
                  const widthPct = total > 0 ? Math.round((Number(cat.amount) / total) * 100) : 0;
                  const barColor = CAT_COLORS[i % CAT_COLORS.length];
                  return (
                    <div key={cat.category} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>{cat.category}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14' }}>{fmt(cat.amount)}</span>
                      </div>
                      <div style={{ height: 6, background: '#F0F2F7', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: barColor, width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </SurfaceCard>
            )}

            {/* Partner splits */}
            {pl.partnerSplits && pl.partnerSplits.length > 0 && (
              <SurfaceCard>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Partner Splits (Net Profit)</p>
                {pl.partnerSplits.map(p => (
                  <div key={p.name} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '9px 0', borderBottom: '1px solid #F0F2F7',
                  }}>
                    <span style={{ fontSize: 14, color: '#374151' }}>{p.name} ({pct(p.sharePct)})</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: Number(p.amount) >= 0 ? '#059669' : '#E11D48' }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </SurfaceCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
