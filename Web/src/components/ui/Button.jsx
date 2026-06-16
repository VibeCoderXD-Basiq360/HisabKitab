import clsx from 'clsx';

export default function Button({ children, variant = 'primary', className, ...props }) {
  return (
    <button
      className={clsx(
        'min-h-[48px] px-4 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variant === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600',
        variant === 'outline' && 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
        variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
        variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
