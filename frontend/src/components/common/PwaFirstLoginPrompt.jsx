import { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import usePwaInstall from '../../hooks/usePwaInstall';
import { PWA_INSTALL_LOGIN_SUCCESS_EVENT } from '../../utils/pwaInstallPrompt';

const getStableUserId = (user) => {
  const id = user?._id ?? user?.id;
  return id === undefined || id === null || String(id).trim() === ''
    ? null
    : String(id);
};

const getPreferenceKey = (userId) => `skillbridge:pwa-install-choice:${encodeURIComponent(userId)}`;
const getSessionShownKey = (userId) => `skillbridge:pwa-install-prompt-shown:${encodeURIComponent(userId)}`;

const readPreference = (userId) => {
  try {
    const preference = window.localStorage.getItem(getPreferenceKey(userId));
    return preference === 'install' || preference === 'continue' ? preference : null;
  } catch (error) {
    console.error('Unable to read the PWA installation preference:', error);
    return null;
  }
};

const writePreference = (userId, preference) => {
  try {
    window.localStorage.setItem(getPreferenceKey(userId), preference);
  } catch (error) {
    console.error('Unable to save the PWA installation preference:', error);
  }
};

const wasPromptShownThisSession = (userId) => {
  try {
    return window.sessionStorage.getItem(getSessionShownKey(userId)) === 'shown';
  } catch (error) {
    console.error('Unable to read the PWA installation prompt session state:', error);
    return false;
  }
};

const markPromptShownThisSession = (userId) => {
  try {
    window.sessionStorage.setItem(getSessionShownKey(userId), 'shown');
  } catch (error) {
    console.error('Unable to save the PWA installation prompt session state:', error);
  }
};

const PwaFirstLoginPrompt = () => {
  const { user, loading } = useAuth();
  const {
    isInstallAvailable,
    isStandalone,
    isInstallationComplete,
    isPrompting,
    requestInstall,
  } = usePwaInstall();
  const userId = getStableUserId(user);
  const [loginUserId, setLoginUserId] = useState(null);
  const [installErrorUserId, setInstallErrorUserId] = useState(null);

  useEffect(() => {
    const handleLoginSuccess = (event) => {
      const { userId: loggedInUserId } = event.detail || {};
      if (typeof loggedInUserId === 'string' && loggedInUserId) {
        const alreadyPrompted = wasPromptShownThisSession(loggedInUserId);
        setInstallErrorUserId(null);
        setLoginUserId(
          readPreference(loggedInUserId) || alreadyPrompted
            ? null
            : loggedInUserId,
        );
      }
    };

    window.addEventListener(PWA_INSTALL_LOGIN_SUCCESS_EVENT, handleLoginSuccess);
    return () => {
      window.removeEventListener(PWA_INSTALL_LOGIN_SUCCESS_EVENT, handleLoginSuccess);
    };
  }, []);

  const promptEligible = Boolean(
    user
    && userId
    && userId === loginUserId
    && !loading
    && !isStandalone
    && !isInstallationComplete
    && !readPreference(userId),
  );
  const isPromptVisible = Boolean(
    promptEligible
    && (isInstallAvailable || isPrompting || installErrorUserId === userId),
  );

  useEffect(() => {
    if (isPromptVisible && userId) {
      markPromptShownThisSession(userId);
    }
  }, [isPromptVisible, userId]);

  const handleContinue = () => {
    if (!userId || !isPromptVisible) return;

    writePreference(userId, 'continue');
    setLoginUserId(null);
  };

  const handleInstall = async () => {
    if (!userId || !isPromptVisible || !isInstallAvailable || isPrompting) return;

    const result = await requestInstall();
    if (['accepted', 'dismissed', 'already-installed'].includes(result.outcome)) {
      writePreference(userId, 'install');
      setLoginUserId(null);
    } else {
      setInstallErrorUserId(userId);
    }
  };

  if (!isPromptVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Install SkillBridge"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '76px',
        right: '16px',
        zIndex: 1100,
        width: 'min(390px, calc(100vw - 32px))',
        padding: '16px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <strong style={{ display: 'block', marginBottom: '6px', fontSize: '1rem' }}>
        Install SkillBridge
      </strong>
      <p style={{ marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Add SkillBridge to your phone&apos;s home screen for quicker access. You can keep using the website without installing it.
      </p>
      {installErrorUserId === userId && (
        <p role="status" style={{ marginBottom: '12px', color: 'var(--danger-text)', fontSize: '0.88rem' }}>
          The browser could not open the installation prompt. You can continue using SkillBridge in your browser.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
        {(isInstallAvailable || isPrompting) && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={isPrompting}
            aria-busy={isPrompting}
            style={{
              minHeight: '40px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--fb-blue)',
              color: 'var(--text-on-primary)',
              fontWeight: 700,
              opacity: isPrompting ? 0.7 : 1,
              cursor: isPrompting ? 'wait' : 'pointer',
            }}
          >
            {isPrompting ? 'Opening install prompt...' : 'Install SkillBridge'}
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          style={{
            minHeight: '40px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--bg-section-alt)',
            color: 'var(--text-primary)',
            fontWeight: 700,
          }}
        >
          Continue using website
        </button>
      </div>
    </aside>
  );
};

export default PwaFirstLoginPrompt;
