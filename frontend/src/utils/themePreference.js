const isValidTheme = (theme) => theme === 'light' || theme === 'dark';

const getThemeKey = (user) => {
  const userId = user?.id || user?._id;
  if (!userId || !user?.role) return null;
  return `fh_theme_${user.role}_${userId}`;
};

export const readUserTheme = (user) => {
  const key = getThemeKey(user);
  if (!key) return null;

  const savedTheme = sessionStorage.getItem(key);
  return isValidTheme(savedTheme) ? savedTheme : null;
};

export const getUserTheme = (user) => (
  readUserTheme(user) ||
  (isValidTheme(user?.theme) ? user.theme : 'light')
);

export const saveUserTheme = (user, theme) => {
  const key = getThemeKey(user);
  if (key && isValidTheme(theme)) {
    sessionStorage.setItem(key, theme);
  }
};

export const applyUserTheme = (user) => {
  document.documentElement.setAttribute('data-theme', getUserTheme(user));
};
