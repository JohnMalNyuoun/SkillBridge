import { useCallback, useEffect, useRef, useState } from 'react';
import { PwaInstallContext } from './PwaInstallContextValue';

const getStandaloneState = () => {
  if (typeof window === 'undefined') return false;

  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
  return Boolean(displayModeStandalone || iosStandalone);
};

const getIosDeviceState = () => {
  if (typeof navigator === 'undefined') return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const PwaInstallProvider = ({ children }) => {
  const promptEventRef = useRef(null);
  const installationCompletedRef = useRef(getStandaloneState());
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(getStandaloneState);
  const [isInstallationComplete, setIsInstallationComplete] = useState(getStandaloneState);
  const [isPrompting, setIsPrompting] = useState(false);
  const isIOS = getIosDeviceState();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;

    const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
    const updateStandaloneState = () => {
      const standalone = Boolean(standaloneQuery?.matches || navigator.standalone === true);
      setIsStandalone(standalone);
      if (standalone) {
        installationCompletedRef.current = true;
        setIsInstallationComplete(true);
      }
    };
    const handleBeforeInstallPrompt = (event) => {
      if (typeof event.prompt !== 'function' || installationCompletedRef.current) return;

      event.preventDefault();
      promptEventRef.current = event;
      setIsInstallAvailable(true);
    };
    const handleAppInstalled = () => {
      promptEventRef.current = null;
      installationCompletedRef.current = true;
      setIsInstallAvailable(false);
      setIsInstallationComplete(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (standaloneQuery?.addEventListener) {
      standaloneQuery.addEventListener('change', updateStandaloneState);
    } else if (standaloneQuery?.addListener) {
      standaloneQuery.addListener(updateStandaloneState);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (standaloneQuery?.removeEventListener) {
        standaloneQuery.removeEventListener('change', updateStandaloneState);
      } else {
        standaloneQuery?.removeListener(updateStandaloneState);
      }
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (isInstallationComplete || isStandalone) {
      return { outcome: 'already-installed' };
    }

    const promptEvent = promptEventRef.current;
    if (
      !promptEvent
      || typeof promptEvent.prompt !== 'function'
      || !promptEvent.userChoice
    ) {
      return { outcome: 'unavailable' };
    }

    promptEventRef.current = null;
    setIsInstallAvailable(false);
    setIsPrompting(true);

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      return { outcome: choice.outcome };
    } catch (error) {
      console.error('Unable to request PWA installation:', error);
      return { outcome: 'error', error };
    } finally {
      setIsPrompting(false);
    }
  }, [isInstallationComplete, isStandalone]);

  const value = {
    isInstallAvailable: isInstallAvailable && !isStandalone && !isInstallationComplete,
    isStandalone,
    isInstallationComplete,
    canShowInstallGuide: isIOS && !isStandalone && !isInstallationComplete && !isInstallAvailable,
    isIOS,
    isPrompting,
    requestInstall,
  };

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
};
