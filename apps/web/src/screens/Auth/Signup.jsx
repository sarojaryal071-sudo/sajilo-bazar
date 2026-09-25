import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { PhoneInput } from '../../components/PhoneInput.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { GoogleSignInButton } from '../../components/GoogleSignInButton.jsx';
import { GooglePhoneRoleForm } from '../../components/GooglePhoneRoleForm.jsx';
import { HomeLocationStep } from '../../components/HomeLocationStep.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePostAuthPath } from '../../lib/postAuthRedirect.js';

const ROLES = [
  { value: 'customer', title: 'I need a service', subtitle: 'Book trusted workers for home jobs' },
  { value: 'worker', title: 'I offer a service', subtitle: 'Get booked for jobs near you' },
];

export function Signup() {
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState(null);
  const [googleError, setGoogleError] = useState('');
  // Set only right after a brand-new customer account is created (phone+
  // password or Google) - gates the Home Location step before the normal
  // post-auth redirect. Never set for an existing account logging back in.
  const [newCustomer, setNewCustomer] = useState(null);

  async function proceedAfterSignup(user) {
    if (user.role === 'customer') {
      setNewCustomer(user);
      return;
    }
    navigate(await resolvePostAuthPath(user));
  }

  async function handleHomeLocationDone() {
    navigate(await resolvePostAuthPath(newCustomer));
  }

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
      const user = await signup({ ...form, email: form.email || null, role });
      await proceedAfterSignup(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(idToken) {
    setGoogleError('');
    try {
      const result = await googleAuth(idToken);
      if (result.needsPhone) {
        setGooglePending(result);
        return;
      }
      navigate(await resolvePostAuthPath(result.user));
    } catch (err) {
      setGoogleError(err.message);
    }
  }

  async function handleGoogleSignupComplete(user) {
    await proceedAfterSignup(user);
  }

  if (newCustomer) {
    return (
      <AuthScreen>
        <HomeLocationStep onDone={handleHomeLocationDone} />
      </AuthScreen>
    );
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

  if (!role) {
    return (
      <AuthScreen>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join Sajilo Bazar</h1>
          <p className="mt-1 text-text-muted">First, tell us why you're here.</p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {ROLES.map((option) => (
            <motion.button
              key={option.value}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRole(option.value)}
              className="rounded-2xl bg-surface-alt p-5 text-left shadow-neu-inset transition-shadow"
            >
              <p className="text-lg font-semibold">{option.title}</p>
              <p className="mt-1 text-sm text-text-muted">{option.subtitle}</p>
            </motion.button>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-solid">
            Log in
          </Link>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <button onClick={() => setRole(null)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-center text-2xl font-bold">
        {role === 'worker' ? 'Sign up as a worker' : 'Create your account'}
      </h1>

      <div className="mt-6 flex flex-col gap-3">
        <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
        {googleError && <p className="text-center text-sm text-danger">{googleError}</p>}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          name="fullName"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
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
        <Input
          label="Email (optional)"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="auth-btn mt-2 w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthScreen>
  );
}
