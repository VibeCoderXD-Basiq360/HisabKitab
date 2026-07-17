/**
 * ProgressBar — horizontal fill bar with smart color based on percentage.
 * Spec: height 4-6px, bg #F0F2F7, border-radius 3px
 *   < 80%:  teal gradient  #00C2B2 → #00D896
 *   80-99%: amber gradient #F59E0B → #FBBF24
 *   ≥ 100%: red gradient   #F43F5E → #FB7185
 */
export default function ProgressBar({ pct, height = 5, style = {} }) {
  const clamped = Math.min(Math.max(pct || 0, 0), 100);

  let fill;
  if (pct >= 100) {
    fill = 'linear-gradient(90deg, #F43F5E, #FB7185)';
  } else if (pct >= 80) {
    fill = 'linear-gradient(90deg, #F59E0B, #FBBF24)';
  } else {
    fill = 'linear-gradient(90deg, #00C2B2, #00D896)';
  }

  return (
    <div style={{
      height,
      borderRadius: 3,
      background: '#F0F2F7',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        height: '100%',
        width: `${clamped}%`,
        background: fill,
        borderRadius: 3,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}
