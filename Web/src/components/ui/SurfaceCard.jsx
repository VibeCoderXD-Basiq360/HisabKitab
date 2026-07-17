/**
 * SurfaceCard — standard white card with soft shadow.
 * Spec: bg white, border-radius 20px, box-shadow 0 2px 14px rgba(0,0,0,0.05), padding 16px.
 */
export default function SurfaceCard({ children, className = '', style = {}, onClick }) {
  const base = {
    background: '#FFFFFF',
    borderRadius: 20,
    boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
    padding: 16,
    ...style,
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ ...base, width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <div style={base} className={className}>
      {children}
    </div>
  );
}
