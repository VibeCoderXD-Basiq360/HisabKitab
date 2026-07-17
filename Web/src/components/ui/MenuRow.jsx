/**
 * MenuRow — settings/profile list row with icon box, label, optional sublabel, chevron.
 * Spec: flex align-center, gap 12px, padding 12px 16-18px, border-top 1px solid #F0F2F7
 *       Icon box: 34-36px, border-radius 10-11px, colored gradient bg
 *       Label: 13-14px/700/#0A0D14 | Sublabel: 11px/500/#B0B8C4
 *       Chevron: svg stroke #D9DDE5
 */
export default function MenuRow({
  icon,         // emoji or react node
  iconBg,       // css background (color or gradient string)
  label,
  sublabel,
  labelColor,   // override label color (e.g. red for destructive actions)
  onClick,
  rightSlot,    // replaces chevron when provided (e.g. a badge or toggle)
  isFirst = false,
  noBorder = false,
}) {
  const Tag = rightSlot ? 'div' : 'button';
  const interactiveProps = onClick
    ? Tag === 'div'
      ? {
          onClick,
          role: 'button',
          tabIndex: 0,
          onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } },
        }
      : { onClick }
    : {};

  return (
    <Tag
      {...interactiveProps}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        borderTop: (isFirst || noBorder) ? 'none' : '1px solid #F0F2F7',
        background: 'transparent',
        border: 'none',
        borderTopWidth: (isFirst || noBorder) ? 0 : 1,
        borderTopStyle: 'solid',
        borderTopColor: '#F0F2F7',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        background: iconBg || '#F0F2F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 17,
      }}>
        {icon}
      </div>

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 700,
          color: labelColor || '#0A0D14',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {label}
        </p>
        {sublabel && (
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#B0B8C4',
            margin: '2px 0 0',
            lineHeight: 1.3,
          }}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Right: custom slot or chevron */}
      {rightSlot || (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9DDE5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </Tag>
  );
}
