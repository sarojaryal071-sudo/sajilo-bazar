import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { PhoneInput } from '../../components/PhoneInput.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePostAuthPath } from '../../lib/postAuthRedirect.js';

// Deliberately open for this testing/pre-launch phase (business-accepted,
// documented decision - see docs/WORKING_AGREEMENT.md task history): phone
// number in, new password out, no OTP/email/admin verification of
// ownership. Not a gap - do not add a verification step here without being
// asked.
export function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', newPassword: '', confirmPassword: '' });
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPhoneError('');

    if (!form.phone || !isValidPhoneNumber(form.phone)) {
      setPhoneError('Enter a valid phone number, including the country code');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords don’t match');
      return;
    }

    setSubmitting(true);
    try {
      const user = await forgotPassword({ phone: form.phone, newPassword: form.newPassword });
      navigate(await resolvePostAuthPath(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-text-muted">
          Enter the phone number on your account and choose a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <PhoneInput
          label="Phone number"
          name="phone"
          error={phoneError}
          value={form.phone}
          onChange={(value) => {
            setForm({ ...form, phone: value });
            if (phoneError) setPhoneError('');
          }}
        />
        <PasswordInput
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
        <PasswordInput
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="auth-btn mt-2 w-full">
          {submitting ? 'Resetting...' : 'Reset password'}
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
