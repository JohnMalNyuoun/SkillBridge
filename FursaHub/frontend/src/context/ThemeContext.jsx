import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'fursahub_theme';
const VALID = ['light', 'dark', 'high-contrast-data-saver'];

function readInitial() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(t) ? t : 'light';
  } catch {
    return 'light';
  }
}

function applyToDocument(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('hc-data-saver', theme === 'high-contrast-data-saver');
  root.dataset.lowData = theme === 'high-contrast-data-saver' ? 'true' : 'false';
}

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(readInitial);

  useEffect(() => { applyToDocument(theme); }, [theme]);

  // Sync from server-stored user settings after login.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get('/users/me/settings').then(({ data }) => {
      if (cancelled) return;
      const t = data?.settings?.theme;
      if (t && VALID.includes(t) && t !== theme) {
        setThemeState(t);
        try { localStorage.setItem(STORAGE_KEY, t); } catch {}
      }
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setTheme = useCallback(async (next) => {
    if (!VALID.includes(next)) return;
    setThemeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    if (user) {
      try { await api.patch('/users/me/settings', { theme: next }); } catch {}
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
