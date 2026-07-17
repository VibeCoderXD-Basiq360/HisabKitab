/**
 * Badge — uppercase pill label.
 * Spec: 9px/800/uppercase, padding 2-4px 7-10px, border-radius 20px.
 * Preset variants cover the most common states; custom color/bg also accepted.
 */

const PRESETS = {
  'awaiting':   { color: '#F59E0B', bg: '#FFFBEB' },
  'requested':  { color: '#6366F1', bg: '#EEF2FF' },
  'on-track':   { color: '#10B981', bg: '#F0FDF4' },
  'due-today':  { color: '#F43F5E', bg: '#FFF1F3' },
  'overdue':    { color: '#E11D48', bg: '#FFF1F3' },
  'recurring':  { color: '#7C3AED', bg: '#F5F3FF' },
  'pro':        { color: '#4F46E5', bg: '#EEF2FF' },
  'pending':    { color: '#F59E0B', bg: '#FFFBEB' },
  'active':     { color: '#059669', bg: '#F0FDF4' },
  'success':    { color: '#059669', bg: '#F0FDF4' },
  'danger':     { color: '#E11D48', bg: '#FFF1F3' },
  'warning':    { color: '#F59E0B', bg: '#FFFBEB' },
  'purple':     { color: '#7C3AED', bg: '#F5F3FF' },
  'neutral':    { color: '#6B7280', bg: '#F3F4F6' },
};

export default function Badge({ variant = 'neutral', label, color, bg, style = {} }) {
  const preset = PRESETS[variant] || PRESETS.neutral;
  const c = color || preset.color;
  const b = bg    || preset.bg;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 9,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: c,
      background: b,
      borderRadius: 20,
      padding: '3px 8px',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      ...style,
    }}>
      {label}
    </span>
  );
}
