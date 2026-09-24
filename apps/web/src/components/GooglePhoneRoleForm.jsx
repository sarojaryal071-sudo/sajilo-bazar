import { useState } from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { PhoneInput } from './PhoneInput.jsx';
import { Button } from './Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'customer', title: 'I need a service', subtitle: 'Book trusted workers for home jobs' },
  { value: 'worker', title: 'I offer a service', subtitle: 'Get booked for jobs near you' },
];

// Shown in place of the normal Login/Signup form once a Google sign-in
// comes back with needsPhone: true (a brand-new account) - phone number is
// the platform's core identifier (trust score, booking, phone-privacy
// scoping), so it's required here even though Google already authenticated
// the person. No SMS/OTP check on it yet (see completeGoogleSignup) -
// same as a phone+password signup today.
export function GooglePhoneRoleForm({ pendingToken, fullName, onComplete, onCancel }) {
  const { completeGoogleSignup } = useAuth();
  const [role, setRole] = useState(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPhoneError('');

    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError('Enter a valid phone number, including the country code');
      return;
    }
    if (!role) {
      setError("Choose whether you need a service or offer one.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await completeGoogleSignup({ pendingToken, phone, role });
      onComplete(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={onCancel} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-center text-2xl font-bold">
        Almost done{fullName ? `, ${fullName.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-1 text-center text-text-muted">We just need a phone number and to know why you're here.</p>

      <div className="mt-6 flex flex-col gap-3">
        {ROLES.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => setRole(option.value)}
            className={`rounded-2xl p-4 text-left shadow-neu-inset transition-shadow ${
              role === option.value ? 'bg-brand text-text-onBrand' : 'bg-surface-alt'
            }`}
          >
            <p className="font-semibold">{option.title}</p>
            <p className={`mt-0.5 text-sm ${role === option.value ? 'opacity-90' : 'text-text-muted'}`}>
              {option.subtitle}
            </p>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <PhoneInput
          label="Phone number"
          name="phone"
          error={phoneError}
          value={phone}
          onChange={(value) => {
            setPhone(value);
            if (phoneError) setPhoneError('');
          }}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="auth-btn w-full">
          {submitting ? 'Finishing up...' : 'Finish signing up'}
        </Button>
      </form>
    </div>
  );
}
