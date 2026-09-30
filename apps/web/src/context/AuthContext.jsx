import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth.api.js';
import * as usersApi from '../api/users.api.js';
import { getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    usersApi
      .getMe()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signup = useCallback(async (input) => {
    const { token, user } = await authApi.signup(input);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const login = useCallback(async (input) => {
    const { token, user } = await authApi.login(input);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  // Either logs the user straight in (existing Google-linked account, or a
  // phone+password account sharing the same verified email) and returns
  // { user }, or - for a genuinely new sign-in - returns
  // { needsPhone: true, pendingToken, fullName, email } without touching
  // the stored token/user at all, so the caller can collect phone+role and
  // call completeGoogleSignup next.
  const googleAuth = useCallback(async (idToken) => {
    const result = await authApi.google(idToken);
    if (result.needsPhone) return result;
    setToken(result.token);
    setUser(result.user);
    return { user: result.user };
  }, []);

  const completeGoogleSignup = useCallback(async (input) => {
    const { token, user } = await authApi.completeGoogleSignup(input);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  // Resets the password and logs the user in with the new one in the same
  // step - see auth.service.js forgotPassword.
  const forgotPassword = useCallback(async (input) => {
    const { token, user } = await authApi.forgotPassword(input);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  // Document-based password reset request (target-spec Phase 9/10) - public,
  // doesn't touch the stored token/user at all; it just submits into the
  // admin-reviewed queue. Distinct from forgotPassword above, which resets
  // immediately with no review.
  const requestPasswordReset = useCallback(async (input) => {
    return authApi.requestPasswordReset(input);
  }, []);

  // The forced-change screen after a temp-password login - already
  // authenticated (that's how they got the temp password's token in the
  // first place), so this just updates the stored user in place; no new
  // token is issued.
  const changePassword = useCallback(async (input) => {
    const { user } = await authApi.changePassword(input);
    setUser(user);
    return user;
  }, []);

  // Doesn't navigate itself - clearing `user` makes AppShell/ProtectedRoute
  // fall through to their own `!user` redirect, which lands on "/" (the
  // landing page), not straight into the login form.
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await usersApi.getMe();
    setUser(user);
    return user;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        googleAuth,
        completeGoogleSignup,
        forgotPassword,
        requestPasswordReset,
        changePassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
