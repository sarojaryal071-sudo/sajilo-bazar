import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePostAuthPath } from '../../lib/postAuthRedirect.js';
import { FullScreenSpinner } from '../../components/Skeleton.jsx';

// Forced password change after logging in with a temp password (target-
// spec Phase 9/10) - reached only via AppShell's/ProtectedRoute's
// mustChangePassword redirect, never linked to directly. Already
// authenticated (requireAuth on the backend), so there's no "current
// password" field - just the new one, twice. Does its own lighter
// auth-only check rather than using ProtectedRoute, which would redirect
// straight back here as long as mustChangePassword stays true.
export function ChangePassword() {
  const { user, loading, changePassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords don’t match');
      return;
    }

    setSubmitting(true);
    try {
      const updatedUser = await changePassword({ newPassword });
      navigate(await resolvePostAuthPath(updatedUser));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-text-muted">
          {user?.fullName ? `Hi ${user.fullName.split(' ')[0]}, ` : ''}you're using a temporary password. Choose a
          new one to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <PasswordInput
          label="New password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordInput
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting} className="auth-btn mt-2 w-full">
          {submitting ? 'Saving...' : 'Save password'}
        </Button>
      </form>
    </AuthScreen>
  );
}
