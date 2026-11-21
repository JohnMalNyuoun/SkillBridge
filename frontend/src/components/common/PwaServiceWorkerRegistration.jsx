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
    const getCurrentBundlePath = () => {
      const appScript = document.querySelector('script[type="module"][src]');
      if (!appScript) return null;

      const bundlePath = new URL(appScript.src, window.location.href).pathname;
      return bundlePath.startsWith('/assets/') ? bundlePath : null;
    };
    const requestSafeActivation = () => {
      const bundlePath = getCurrentBundlePath();
      if (!active || !registration?.waiting || !bundlePath) return;

      registration.waiting.postMessage({
        type: 'ACTIVATE_IF_SAFE',
        bundlePath
      });
    };
    const watchInstallingWorker = () => {
      const installingWorker = registration?.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') requestSafeActivation();
      });
    };
    const checkForUpdates = () => {
      if (!registration) return;
      requestSafeActivation();
      registration.update()
        .then(requestSafeActivation)
        .catch((error) => {
          console.error('Unable to check for website updates:', error);
        });
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
        registration.addEventListener('updatefound', watchInstallingWorker);
        watchInstallingWorker();
        requestSafeActivation();
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
      registration?.removeEventListener('updatefound', watchInstallingWorker);
    };
  }, []);

  return null;
};

export default PwaServiceWorkerRegistration;
