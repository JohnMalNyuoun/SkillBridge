const LEGACY_THEME_PREFIX = 'fh_theme';

export const isValidTheme = (theme) => theme === 'light' || theme === 'dark';

const getThemeKey = (user) => {
  const userId = user?.id || user?._id;
  if (!userId || !user?.role) return null;
  return `${LEGACY_THEME_PREFIX}_${user.role}_${userId}`;
};

export const readStoredTheme = (user) => {
  const key = getThemeKey(user);
  try {
    const savedTheme = key ? localStorage.getItem(key) : null;
    if (isValidTheme(savedTheme)) return savedTheme;

    const sessionTheme = key ? sessionStorage.getItem(key) : null;
    if (isValidTheme(sessionTheme)) {
      if (key) localStorage.setItem(key, sessionTheme);
      return sessionTheme;
    }

  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
  return null;
};

export const readUserTheme = readStoredTheme;

export const getUserTheme = (user, serverTheme) => {
  const stored = readStoredTheme(user);
  if (stored) return stored;
  if (isValidTheme(serverTheme)) return serverTheme;
  if (isValidTheme(user?.theme)) return user.theme;
  return 'light';
};

export const applyTheme = (theme) => {
  const safeTheme = isValidTheme(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', safeTheme);
  document.documentElement.style.colorScheme = safeTheme;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', safeTheme === 'dark' ? '#18191A' : '#ffffff');
  }
};

export const saveUserTheme = (user, theme) => {
  if (!isValidTheme(theme)) return;

  try {
    const key = getThemeKey(user);
    if (key) {
      localStorage.setItem(key, theme);
      sessionStorage.setItem(key, theme);
    }
  } catch {
    // The applied theme still works for the current page if storage is blocked.
  }
  applyTheme(theme);
};

export const applyUserTheme = (user) => {
  applyTheme(getUserTheme(user));
};
