import ReactPhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

// Country dropdown (flag + dial code, alphabetical by country name - the
// library's default order) defaulting to Nepal but not restricted to it.
// Value is always E.164 (e.g. "+9779812345678"), matching the existing
// `phone` column - no format conversion needed anywhere else.
export function PhoneInput({ label, error, value, onChange, name }) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={name}>
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <ReactPhoneInput
        id={name}
        name={name}
        international
        flags={flags}
        defaultCountry="NP"
        value={value}
        onChange={(next) => onChange(next || '')}
        placeholder="98XXXXXXXX"
        className={`sajilo-phone-input rounded-md border border-border bg-surface px-4 ${
          error ? 'border-danger' : ''
        }`}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </label>
  );
}
