export const PWA_INSTALL_LOGIN_SUCCESS_EVENT = 'skillbridge:pwa-login-success';

export const notifyPwaLoginSuccess = (userId) => {
  if (
    typeof window === 'undefined'
    || typeof CustomEvent === 'undefined'
    || userId === undefined
    || userId === null
    || String(userId).trim() === ''
  ) {
    return;
  }

  window.dispatchEvent(new CustomEvent(PWA_INSTALL_LOGIN_SUCCESS_EVENT, {
    detail: { userId: String(userId) },
  }));
};
