/**
 * TransactionRow — single expense/income row used in transaction lists.
 * Spec:
 *   Layout: flex align-center, padding 13px 16px, border-bottom 1px solid #F0F2F7
 *   Icon: 42×42px, border-radius 13px, colored bg, white initial
 *   Title: 14px/700/#0A0D14 | Subtitle: 11px/500/#B0B8C4
 *   Amount: 15px/700, red (#E11D48) for expense, green (#059669) for income
 */
export default function TransactionRow({
  icon,           // emoji string or react node shown inside icon box
  iconBg,         // css background for icon box (color string or gradient)
  title,
  subtitle,
  amount,         // formatted string e.g. "₹1,200"
  isIncome = false,
  isLast = false,
  onClick,
  rightSlot,      // optional node replacing amount (badges, etc.)
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '13px 16px',
        borderBottom: isLast ? 'none' : '1px solid #F0F2F7',
        cursor: onClick ? 'pointer' : 'default',
        gap: 12,
        background: '#FFFFFF',
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        background: iconBg || '#F0F2F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 18,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#0A0D14',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </p>
        {subtitle && (
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#B0B8C4',
            margin: '2px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Amount or right slot */}
      {rightSlot || (
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: isIncome ? '#059669' : '#E11D48',
          flexShrink: 0,
          letterSpacing: '-0.3px',
        }}>
          {isIncome ? '+' : '-'}{amount}
        </span>
      )}
    </div>
  );
}
