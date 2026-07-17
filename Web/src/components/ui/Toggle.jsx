/**
 * Toggle — iOS-style on/off switch.
 * Spec: 46×26px container, border-radius 13px
 *   ON:  background #00C2B2, knob slides to right
 *   OFF: background #E9ECF0, knob at left
 */
export default function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!value)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        background: value ? '#00C2B2' : '#E9ECF0',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s ease',
        padding: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: value ? 'calc(100% - 23px)' : 3,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        transition: 'left 0.2s ease',
        display: 'block',
      }} />
    </button>
  );
}
