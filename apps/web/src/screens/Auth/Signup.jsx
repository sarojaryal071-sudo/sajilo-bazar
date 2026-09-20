import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
      <Screen>
        <h1 className="text-2xl font-bold">Join Sajilo Bazar</h1>
        <p className="mt-1 text-text-muted">First, tell us why you're here.</p>

        <div className="mt-8 flex flex-col gap-4">
          {ROLES.map((option) => (
            <motion.button
              key={option.value}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRole(option.value)}
              className="rounded-2xl border border-border bg-surface-raised p-5 text-left shadow-resting transition-shadow hover:shadow-raised"
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
      </Screen>
    );
  }

  return (
    <Screen>
      <button onClick={() => setRole(null)} className="mb-4 self-start text-sm text-text-muted">
        &larr; Back
      </button>
      <h1 className="text-2xl font-bold">
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
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Email (optional)"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Screen>
  );
}
