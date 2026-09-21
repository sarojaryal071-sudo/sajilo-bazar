import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'sajilo-theme';

// Welcome/Login/Signup were designed and verified in one fixed look (see
// AuthScreen.jsx) - the stored theme preference (and even the OS's own
// prefers-color-scheme) never applies there, only inside the authenticated
// app shell. tokens.css enforces this the other way too: any explicit
// data-theme attribute on :root suppresses the prefers-color-scheme media
// query, so this is the only place that ever sets it.
const FIXED_THEME_PATHS = new Set(['/', '/login', '/signup']);

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const location = useLocation();
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || (systemPrefersDark() ? 'dark' : 'light')
  );

  useEffect(() => {
    const effective = FIXED_THEME_PATHS.has(location.pathname) ? 'light' : theme;
    document.documentElement.dataset.theme = effective;
  }, [theme, location.pathname]);

  function setTheme(next) {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
