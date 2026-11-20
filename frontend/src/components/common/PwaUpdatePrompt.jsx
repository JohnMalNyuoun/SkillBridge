import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PwaUpdatePrompt = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [updateError, setUpdateError] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  useEffect(() => {
    const updateConnectionStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  if (isOnline && !offlineReady && !needRefresh && !updateError) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setUpdateError(false);
  };

  const applyUpdate = async () => {
    try {
      await updateServiceWorker(true);
    } catch (error) {
      console.error('Unable to apply the service worker update:', error);
      setUpdateError(true);
    }
  };

  return (
    <aside
      role={needRefresh || updateError ? 'alert' : 'status'}
      aria-live="polite"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 1100,
        width: 'min(380px, calc(100vw - 32px))',
        padding: '16px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {!isOnline && (
        <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          You are offline. The app shell may load, but account features and live data need an internet connection.
        </p>
      )}
      {updateError && (
        <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          The update could not be applied. You can try again later.
        </p>
      )}
      {needRefresh && (
        <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          A new version of SkillBridge is ready.
        </p>
      )}
      {offlineReady && isOnline && !needRefresh && !updateError && (
        <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          The app shell is available offline. Some features still need an internet connection.
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        {needRefresh && (
          <button
            type="button"
            onClick={applyUpdate}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--fb-blue)',
              color: 'var(--text-on-primary)',
              fontWeight: 700,
            }}
          >
            Update now
          </button>
        )}
        {(offlineReady || needRefresh || updateError) && (
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--bg-section-alt)',
              color: 'var(--text-primary)',
              fontWeight: 700,
            }}
          >
            {needRefresh ? 'Later' : 'Dismiss'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default PwaUpdatePrompt;
