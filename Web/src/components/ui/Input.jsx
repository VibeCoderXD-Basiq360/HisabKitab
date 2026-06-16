import clsx from 'clsx';

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={clsx(
          'min-h-[48px] px-4 rounded-xl border border-gray-200 bg-white text-base outline-none w-full',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-shadow',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
