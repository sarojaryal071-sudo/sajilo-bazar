import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { PhoneInput } from '../../components/PhoneInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Document-based password reset for locked-out workers (target-spec Phase
// 9/10) - the alternative to ForgotPassword.jsx for a worker who wants an
// admin to actually confirm identity first, instead of the open
// phone-in/password-out flow. No document upload here: the admin reviews
// the same verification documents already on file from onboarding.
export function WorkerPasswordResetRequest() {
  const { requestPasswordReset } = useAuth();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPhoneError('');

    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError('Enter a valid phone number, including the country code');
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset({ phone });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthScreen>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Request submitted</h1>
          <p className="mt-2 text-text-muted">
            Our team will review your verification documents and confirm your identity. Once approved, you'll
            receive a temporary password - you'll be asked to set a new one the next time you log in with it.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-text-muted">
          <Link to="/login" className="font-semibold text-brand-solid">
            &larr; Back to log in
          </Link>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Locked out?</h1>
        <p className="mt-1 text-text-muted">
          For worker accounts, our team can confirm your identity against the verification documents already on
          file and issue a temporary password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
        <Button type="submit" disabled={submitting} className="auth-btn mt-2 w-full">
          {submitting ? 'Submitting...' : 'Submit request'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link to="/login" className="font-semibold text-brand-solid">
          &larr; Back to log in
        </Link>
      </p>
    </AuthScreen>
  );
}
