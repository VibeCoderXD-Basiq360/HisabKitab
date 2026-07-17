import { useState } from 'react';
import clsx from 'clsx';

export default function Input({ label, error, className, style, ...props }) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? '#E11D48'
    : focused
    ? '#00C2B2'
    : '#E9ECF0';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label style={{ color: '#374151', fontSize: 12, fontWeight: 700 }}>
          {label}
        </label>
      )}
      <input
        className={clsx('outline-none w-full', className)}
        style={{
          background: '#F0F2F7',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 10,
          padding: '11px 14px',
          color: '#0A0D14',
          fontSize: 14,
          minHeight: 48,
          transition: 'border-color 0.15s',
          ...style,
        }}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <span style={{ color: '#E11D48', fontSize: 12 }}>{error}</span>
      )}
    </div>
  );
}
