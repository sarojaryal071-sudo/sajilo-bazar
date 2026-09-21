import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthScreen } from '../../components/AuthScreen.jsx';
import { Button } from '../../components/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function Welcome() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to={user.role === 'worker' ? '/worker/dashboard' : '/home'} replace />;

  return (
    <AuthScreen className="items-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand shadow-neu-button">
          <span className="text-3xl font-extrabold text-text-onBrand">SB</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Sajilo Bazar</h1>
        <p className="max-w-xs text-text-muted">
          Trusted local workers for every home job - book directly or get help right now.
        </p>
      </motion.div>

      <div className="mt-10 flex w-full flex-col gap-3">
        <Link to="/signup" className="w-full">
          <Button className="auth-btn w-full">Get started</Button>
        </Link>
        <Link to="/login" className="w-full">
          <Button variant="secondary" className="auth-btn w-full">
            I already have an account
          </Button>
        </Link>
      </div>
    </AuthScreen>
  );
}
