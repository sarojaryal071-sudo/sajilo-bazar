import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';

const STORAGE_KEY = 'sajilo:activeAddress';

// Home's location bar (UI round) - which saved/one-off address is the
// active browsing/booking context right now, shared across screens for
// this browser tab's session (sessionStorage, not the addresses table
// itself - this never changes which address is the account's default,
// just what's currently pre-selected). Cleared on logout so a second
// account signing in on the same tab doesn't inherit the previous one's
// pick.
function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const ActiveAddressContext = createContext(null);

export function ActiveAddressProvider({ children }) {
  const { user } = useAuth();
  const [activeAddress, setActiveAddressState] = useState(readStored);

  function setActiveAddress(address) {
    setActiveAddressState(address);
    try {
      if (address) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private/blocked storage - the in-memory value above still works
      // for the rest of this session, it just won't survive a refresh.
    }
  }

  useEffect(() => {
    if (!user) setActiveAddress(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <ActiveAddressContext.Provider value={{ activeAddress, setActiveAddress }}>
      {children}
    </ActiveAddressContext.Provider>
  );
}

export function useActiveAddress() {
  const ctx = useContext(ActiveAddressContext);
  if (!ctx) throw new Error('useActiveAddress must be used within ActiveAddressProvider');
  return ctx;
}
