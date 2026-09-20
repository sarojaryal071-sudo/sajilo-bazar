import { useState } from 'react';

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-7-11-7a19.7 19.7 0 0 1 4.22-5.17M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a19.6 19.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PasswordInput({ label, error, className = '', id, ...props }) {
  const [visible, setVisible] = useState(false);
  const inputId = id || props.name;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-md border border-border bg-surface px-4 py-3 pr-12 text-text outline-none transition-colors focus:border-brand-solid ${
            error ? 'border-danger' : ''
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  );
}
