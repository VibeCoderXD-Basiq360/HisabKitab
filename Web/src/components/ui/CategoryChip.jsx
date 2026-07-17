/**
 * CategoryChip — used on AddExpensePage category grid.
 * Spec: 52×52px tap area, border-radius 14-15px, flex-col, gap 4-5px
 *   Active:   2.5px border #00C2B2, bg teal-lt (#E6FAF9)
 *   Inactive: colored light bg per category
 *   Emoji: 18-19px | Label: 9px/700
 */
export default function CategoryChip({ emoji, label, active, bg = '#F3F4F6', onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        padding: '10px 4px 8px',
        borderRadius: 15,
        background: active ? '#E6FAF9' : bg,
        border: active ? '2.5px solid #00C2B2' : '2.5px solid transparent',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <span style={{ fontSize: 19, lineHeight: 1 }}>{emoji}</span>
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        color: active ? '#009E90' : '#374151',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1,
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>
        {label}
      </span>
    </button>
  );
}
