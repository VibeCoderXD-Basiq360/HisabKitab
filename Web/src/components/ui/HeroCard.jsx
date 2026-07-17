/**
 * HeroCard — dark navy gradient card used as the primary dashboard widget.
 * Spec: linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)
 *       border-radius 28px, padding 22-24px, decorative teal circle blob.
 */
export default function HeroCard({ children, className = '', style = {} }) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 28,
        padding: '22px 22px 24px',
        background: 'linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)',
        ...style,
      }}
    >
      {/* Decorative teal circle blob */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 190,
        height: 190,
        borderRadius: '50%',
        background: 'rgba(0,194,178,0.10)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
