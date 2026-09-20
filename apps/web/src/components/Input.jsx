export function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <input
        id={inputId}
        className={`rounded-md border border-border bg-surface px-4 py-3 text-text outline-none transition-colors focus:border-brand-solid ${
          error ? 'border-danger' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  );
}
