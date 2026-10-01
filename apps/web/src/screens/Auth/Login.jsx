import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { PhoneInput } from '../../components/PhoneInput.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { GoogleSignInButton, isGoogleSignInConfigured } from '../../components/GoogleSignInButton.jsx';
import { GooglePhoneRoleForm } from '../../components/GooglePhoneRoleForm.jsx';
import { Spinner } from '../../components/Skeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePostAuthPath } from '../../lib/postAuthRedirect.js';

export function Login() {
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '', keepLoggedIn: false });
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState(null);
  const [googleError, setGoogleError] = useState('');
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  // Either path in flight disables both - there's never a reason to let a
  // phone/password submit and a Google sign-in race each other.
  const anySubmitting = submitting || googleSubmitting;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPhoneError('');

    if (!form.phone || !isValidPhoneNumber(form.phone)) {
      setPhoneError('Enter a valid phone number, including the country code');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(form);
      navigate(await resolvePostAuthPath(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(idToken) {
    setGoogleError('');
    setGoogleSubmitting(true);
    try {
      const result = await googleAuth(idToken);
      if (result.needsPhone) {
        setGooglePending(result);
        return;
      }
      navigate(await resolvePostAuthPath(result.user));
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleGoogleSignupComplete(user) {
    navigate(await resolvePostAuthPath(user));
  }

  if (googlePending) {
    return (
      <AuthScreen>
        <GooglePhoneRoleForm
          pendingToken={googlePending.pendingToken}
          fullName={googlePending.fullName}
          onComplete={handleGoogleSignupComplete}
          onCancel={() => setGooglePending(null)}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-text-muted">Log in to continue.</p>
      </div>

      {/* QA2 item 6: the "OR" divider only makes sense between two sign-in
          options. GoogleSignInButton renders nothing at all without a
          configured client id (see its own comment) - without this guard,
          the divider still rendered on its own right under "Log in to
          continue.", dividing phone/password login from an invisible
          button rather than from anything a person could actually see or
          use. Gating both together here, rather than just hiding the
          divider, is what makes the layout read correctly either way:
          "Google OR phone" when Google is configured, "just phone" (no
          dangling divider) when it isn't. */}
      {isGoogleSignInConfigured && (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {/* GoogleSignInButton renders Google's own button via their script,
                not a React element this component controls - pointer-events-none
                + opacity is how it's "disabled" while a request (either path) is
                in flight, since there's no disabled prop to pass through. */}
            <div
              className={`relative flex justify-center ${anySubmitting ? 'pointer-events-none opacity-60' : ''}`}
            >
              <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
              {googleSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner size={20} />
                </div>
              )}
            </div>
            {googleError && <p className="text-center text-sm text-danger">{googleError}</p>}
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${isGoogleSignInConfigured ? '' : 'mt-6'}`}>
        <PhoneInput
          label="Phone number"
          name="phone"
          error={phoneError}
          value={form.phone}
          disabled={anySubmitting}
          onChange={(value) => {
            setForm({ ...form, phone: value });
            if (phoneError) setPhoneError('');
          }}
        />
        <div>
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            disabled={anySubmitting}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Link to="/forgot-password" className="mt-1.5 inline-block text-sm font-medium text-brand-solid">
            Forgot password?
          </Link>
          <Link
            to="/worker/password-reset-request"
            className="mt-1 block text-xs font-medium text-text-muted underline"
          >
            Worker locked out? Request identity verification instead
          </Link>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={form.keepLoggedIn}
            disabled={anySubmitting}
            onChange={(e) => setForm({ ...form, keepLoggedIn: e.target.checked })}
            className="h-4 w-4 accent-brand-solid"
          />
          Keep me logged in
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={anySubmitting} className="auth-btn mt-2 w-full">
          {submitting && <Spinner size={18} className="!text-text-onBrand" />}
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand-solid">
          Sign up
        </Link>
      </p>
    </AuthScreen>
  );
}
