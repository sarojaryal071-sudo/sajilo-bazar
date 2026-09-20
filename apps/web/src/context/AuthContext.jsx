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
    <AuthContext.Provider value={{ user, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
