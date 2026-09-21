import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { PhoneInput } from '../../components/PhoneInput.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePostAuthPath } from '../../lib/postAuthRedirect.js';

const ROLES = [
  { value: 'customer', title: 'I need a service', subtitle: 'Book trusted workers for home jobs' },
  { value: 'worker', title: 'I offer a service', subtitle: 'Get booked for jobs near you' },
];

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
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

    setSubmitting(true);
    try {
      const user = await signup({ ...form, email: form.email || null, role });
      navigate(await resolvePostAuthPath(user));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
