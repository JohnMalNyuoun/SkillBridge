import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const PwaServiceWorkerRegistration = () => {
  useEffect(() => {
    if (
      Capacitor.isNativePlatform()
      || !('serviceWorker' in navigator)
      || !window.isSecureContext
    ) {
      return undefined;
    }

    let registration;
    let active = true;
    const checkForUpdates = () => {
      if (registration) {
        registration.update().catch((error) => {
          console.error('Unable to check for website updates:', error);
        });
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    })
      .then((serviceWorkerRegistration) => {
        if (!active) return;
        registration = serviceWorkerRegistration;
        checkForUpdates();
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });

    const updateInterval = window.setInterval(checkForUpdates, 60 * 60 * 1000);
    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkForUpdates);

    return () => {
      active = false;
      window.clearInterval(updateInterval);
      window.removeEventListener('focus', checkForUpdates);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkForUpdates);
    };
  }, []);

  return null;
};

export default PwaServiceWorkerRegistration;
