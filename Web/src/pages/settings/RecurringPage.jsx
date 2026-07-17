import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import { useRecurring, useToggleRecurring, useDeleteRecurring, useEditSchedule } from '../../hooks/useRecurring';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';

const FREQ_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly', WEEKDAYS: 'Weekdays', WEEKENDS: 'Weekends', CUSTOM_DAYS: 'Custom days' };
const FREQ_ICON  = { DAILY: '📅', WEEKLY: '🗓️', MONTHLY: '📆', YEARLY: '🎯', WEEKDAYS: '🗓️', WEEKENDS: '🏖️', CUSTOM_DAYS: '📌' };
const DAY_NAMES  = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const inputStyle = {
  background: '#F0F2F7',
  border: 'none',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: '#0A0D14',
  outline: 'none',
  width: '100%',
  minHeight: 44,
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: '#B0B8C4',
  marginBottom: 4,
  display: 'block',
};

function toLocalDatetimeInput(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleSheet({ item, onClose }) {
  const { t } = useTranslation();
  const [nextDueDate, setNextDueDate] = useState(toLocalDatetimeInput(item.nextDueDate));
  const [endDate, setEndDate] = useState(item.endDate ? item.endDate.slice(0, 10) : '');
  const edit = useEditSchedule();

  const handleSave = () => {
    edit.mutate(
      { id: item.id, nextDueDate, endDate: endDate || null },
      { onSuccess: onClose }
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(10,13,20,0.55)' }}
    >
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div
        style={{ position: 'relative', width: '100%', background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 4, margin: '0 auto 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: item.category?.color ? `${item.category.color}25` : '#E6FAF9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {item.category?.icon || '💸'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t('common.edit')} schedule</p>
            <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{item.title || item.category?.name || 'Recurring expense'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Next auto-create on</label>
          <input
            type="datetime-local"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>{t('expense.end_date')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
            />
            {endDate && (
              <button
                type="button"
                onClick={() => setEndDate('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 18, padding: '0 8px', lineHeight: 1 }}
              >
                ✕
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{t('expense.end_date_hint')}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={edit.isPending || !nextDueDate}
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#00C2B2,#009E90)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: edit.isPending || !nextDueDate ? 'not-allowed' : 'pointer',
            opacity: edit.isPending || !nextDueDate ? 0.5 : 1,
          }}
        >
          {edit.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const { t } = useTranslation();
  const { data: items = [], isLoading } = useRecurring();
  const toggle = useToggleRecurring();
  const del = useDeleteRecurring();
  const [editItem, setEditItem] = useState(null);

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete recurring "${title || 'expense'}"? Past instances are kept.`)) {
      del.mutate(id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopBar title={t('settings.recurring')} showBack />

      <div style={{ flex: 1, padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#B0B8C4', marginTop: 48 }}>{t('common.loading')}</p>
        )}

        {!isLoading && items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 64, gap: 12 }}>
            <span style={{ fontSize: 48 }}>🔁</span>
            <p style={{ fontSize: 14, color: '#0A0D14', fontWeight: 600, margin: 0 }}>No recurring expenses yet</p>
            <p style={{ fontSize: 12, color: '#B0B8C4', textAlign: 'center', margin: 0, maxWidth: 260 }}>
              When adding an expense, enable "Make this recurring" to auto-create it on a schedule.
            </p>
          </div>
        )}

        {items.map((item) => (
          <SurfaceCard
            key={item.id}
            style={{ padding: 0, overflow: 'hidden', opacity: item.isActive ? 1 : 0.6 }}
          >
            {/* Main row */}
            <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Category icon box */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: item.category?.color ? `${item.category.color}25` : '#E6FAF9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {item.category?.icon || '💸'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }} className="truncate">
                    {item.title || item.category?.name || 'Expense'}
                  </p>
                  <Badge variant="recurring" label={FREQ_LABEL[item.frequency] || item.frequency} />
                </div>

                <p style={{ fontSize: 11, color: '#B0B8C4', margin: '3px 0 0' }}>
                  {item.paymentType?.name}
                  {item.frequency === 'CUSTOM_DAYS' && item.customDays?.length > 0 && (
                    <span style={{ marginLeft: 4 }}>· ({item.customDays.map((d) => DAY_NAMES[d]).join(', ')})</span>
                  )}
                </p>

                {/* Next due */}
                <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>
                  Next: {format(new Date(item.nextDueDate), 'd MMM yyyy, h:mm a')}
                </p>

                {item.endDate && (
                  <p style={{ fontSize: 11, color: '#F97316', margin: '2px 0 0' }}>
                    Ends: {format(new Date(item.endDate), 'd MMM yyyy')}
                  </p>
                )}
                {!item.isActive && item.endDate && new Date(item.nextDueDate) > new Date(item.endDate) && (
                  <p style={{ fontSize: 11, color: '#EF4444', margin: '2px 0 0' }}>Completed — past end date</p>
                )}
              </div>

              {/* Amount + toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
                  ₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <Toggle
                  value={item.isActive}
                  onChange={() => toggle.mutate({ id: item.id, isActive: !item.isActive })}
                  disabled={toggle.isPending}
                />
              </div>
            </div>

            {/* Action bar */}
            <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 8, borderTop: '1px solid #F0F2F7' }}>
              <button
                onClick={() => setEditItem(item)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1.5px solid #E9ECF0',
                  background: '#fff',
                  color: '#0A0D14',
                  cursor: 'pointer',
                }}
              >
                🗓 Schedule
              </button>
              <button
                onClick={() => handleDelete(item.id, item.title)}
                disabled={del.isPending}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1.5px solid #FFE4E6',
                  background: '#FFF1F2',
                  color: '#E11D48',
                  cursor: del.isPending ? 'not-allowed' : 'pointer',
                  opacity: del.isPending ? 0.5 : 1,
                }}
              >
                🗑 {t('common.delete')}
              </button>
            </div>
          </SurfaceCard>
        ))}
      </div>

      {editItem && <ScheduleSheet item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}
