import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import api from '../../lib/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, balance, delta } = payload[0].payload;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      fontSize: 12,
      maxWidth: 180,
    }}>
      <p style={{ fontWeight: 700, color: '#0A0D14', margin: '0 0 4px', lineHeight: 1.3 }}>{label}</p>
      <p style={{ fontWeight: 700, fontSize: 14, color: delta >= 0 ? '#E11D48' : '#059669', margin: 0 }}>
        {delta >= 0 ? '+' : ''}{fmt(delta)}
      </p>
      <p style={{ color: '#B0B8C4', margin: '4px 0 0' }}>Balance: {fmt(balance)}</p>
    </div>
  );
}

export default function BalanceHistoryPage() {
  const { t } = useTranslation();
  const { personId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['balance-history', personId],
    queryFn: () => api.get(`/splits/balance-history/${personId}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const person = data?.person;
  const rawTimeline = data?.timeline || [];

  // Prepend a zero-balance origin point for the chart
  const chartData = rawTimeline.length > 0
    ? [{ date: rawTimeline[0].date, balance: 0, label: 'Start', delta: 0 }, ...rawTimeline]
    : [];

  const currentBalance = rawTimeline.length > 0 ? rawTimeline[rawTimeline.length - 1].balance : 0;
  const maxAbs = Math.max(...chartData.map((p) => Math.abs(p.balance)), 100);

  // Teal for balanced, red for you-owe, green for they-owe
  const lineColor = currentBalance > 50 ? '#E11D48' : currentBalance < -50 ? '#059669' : '#00C2B2';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={person ? `${person.name} · Balance` : 'Balance History'} showBack />

      <div style={{ flex: 1, padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 100, background: '#FFFFFF', borderRadius: 20, opacity: 0.6 }} />
            <div style={{ height: 220, background: '#FFFFFF', borderRadius: 20, opacity: 0.6 }} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && rawTimeline.length === 0 && (
          <SurfaceCard style={{ padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <span style={{ fontSize: 44 }}>📈</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0D14', margin: 0 }}>No history yet</p>
            <p style={{ fontSize: 13, color: '#B0B8C4', margin: 0 }}>
              Add expenses with {person?.name || 'this person'} to see balance over time.
            </p>
          </SurfaceCard>
        )}

        {!isLoading && rawTimeline.length > 0 && (
          <>
            {/* Current balance summary card */}
            <div style={{
              background: 'linear-gradient(135deg, #0A0D14 0%, #1a2340 100%)',
              borderRadius: 20,
              padding: '20px 20px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Current balance</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>with {person?.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {currentBalance > 0 ? (
                  <>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#E11D48', margin: 0, letterSpacing: '-0.5px' }}>
                      {fmt(currentBalance)}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                      {person?.name} {t('balance.owes_you')}
                    </p>
                  </>
                ) : currentBalance < 0 ? (
                  <>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#059669', margin: 0, letterSpacing: '-0.5px' }}>
                      {fmt(Math.abs(currentBalance))}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                      {t('balance.you_owe')} {person?.name}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: 0 }}>₹0</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>all settled</p>
                  </>
                )}
              </div>
            </div>

            {/* Chart card */}
            <SurfaceCard style={{ padding: '16px 8px 12px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 8px', margin: '0 0 12px' }}>
                Balance over time
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" strokeOpacity={0.8} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(new Date(d), 'd MMM')}
                    tick={{ fontSize: 10, fill: '#B0B8C4' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 10, fill: '#B0B8C4' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[-maxAbs * 1.1, maxAbs * 1.1]}
                    width={40}
                  />
                  <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="4 4" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="stepAfter"
                    dataKey="balance"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 10, color: '#B0B8C4', textAlign: 'center', margin: '6px 0 0' }}>
                Positive = {person?.name} {t('balance.owes_you')} · Negative = {t('balance.you_owe')} {person?.name}
              </p>
            </SurfaceCard>

            {/* Event timeline */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px 4px' }}>
                All events
              </p>
              <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                {[...rawTimeline].reverse().map((event, idx) => {
                  const isCredit = event.delta < 0; // they paid → balance moves down (you're less owed)
                  const isLast = idx === rawTimeline.length - 1;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        borderBottom: isLast ? 'none' : '1px solid #F0F2F7',
                      }}
                    >
                      {/* Direction icon */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 13,
                        background: event.delta >= 0 ? '#FEE2E2' : '#D1FAE5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                      }}>
                        {event.delta >= 0 ? '📤' : '✅'}
                      </div>

                      {/* Label + date */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#0A0D14',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {event.label}
                        </p>
                        <p style={{ fontSize: 11, color: '#B0B8C4', margin: '3px 0 0' }}>
                          {format(new Date(event.date), 'd MMM yyyy')}
                        </p>
                      </div>

                      {/* Delta + running balance */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: event.delta >= 0 ? '#E11D48' : '#059669',
                          margin: 0,
                        }}>
                          {event.delta >= 0 ? '+' : ''}{fmt(event.delta)}
                        </p>
                        <p style={{ fontSize: 11, color: '#B0B8C4', margin: '3px 0 0' }}>{fmt(event.balance)}</p>
                      </div>
                    </div>
                  );
                })}
              </SurfaceCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
