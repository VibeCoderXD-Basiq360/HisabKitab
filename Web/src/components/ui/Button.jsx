import clsx from 'clsx';

const VARIANT_STYLES = {
  primary: {
    background: 'linear-gradient(135deg, #00C2B2, #009E90)',
    color: '#fff',
    borderRadius: 12,
    fontWeight: 800,
    border: 'none',
  },
  outline: {
    background: 'transparent',
    border: '1.5px solid #E9ECF0',
    color: '#374151',
    borderRadius: 12,
    fontWeight: 600,
  },
  secondary: {
    background: 'transparent',
    border: '1.5px solid #E9ECF0',
    color: '#374151',
    borderRadius: 12,
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    border: 'none',
    color: '#374151',
    borderRadius: 12,
    fontWeight: 600,
  },
  danger: {
    background: '#E11D48',
    color: '#fff',
    borderRadius: 12,
    fontWeight: 700,
    border: 'none',
  },
};

export default function Button({ children, variant = 'primary', className, style, disabled, ...props }) {
  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  return (
    <button
      className={clsx(
        'min-h-[48px] px-4 text-sm transition-all active:scale-95',
        className
      )}
      disabled={disabled}
      style={{
        ...variantStyle,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
