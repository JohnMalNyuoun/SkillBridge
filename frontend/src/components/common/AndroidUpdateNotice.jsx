import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { isNativeAndroid } from '../../services/nativeAuthSession';
import { findAndroidUpdate } from '../../utils/androidUpdate';

const AndroidUpdateNotice = () => {
  const [release, setRelease] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNativeAndroid()) return undefined;
    let active = true;

    const checkForUpdate = async () => {
      try {
        const appInfo = await App.getInfo();
        const availableRelease = await findAndroidUpdate(appInfo.version);
        if (active) setRelease(availableRelease);
      } catch (checkError) {
        console.error('Unable to check for Android app updates:', checkError.message);
      }
    };

    checkForUpdate();
    return () => {
      active = false;
    };
  }, []);

  const openRelease = async () => {
    if (!release || opening) return;
    setError('');
    setOpening(true);
    try {
      await Browser.open({ url: release.downloadUrl });
    } catch (openError) {
      console.error('Unable to open the Android APK download:', openError.message);
      setError('The download could not be opened. Please try again later.');
    } finally {
      setOpening(false);
    }
  };

  if (!isNativeAndroid() || !release || dismissed) return null;

  return (
    <aside
      role="status"
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
        boxShadow: 'var(--card-shadow)'
      }}
    >
      <strong>SkillBridge update available</strong>
      <p style={{ margin: '8px 0 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Version {release.version} is available. Download it and follow Android&apos;s installer prompts to update.
      </p>
      {error && (
        <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.88rem' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button type="button" onClick={openRelease} disabled={opening}>
          {opening ? 'Opening download...' : 'Download update'}
        </button>
      </div>
    </aside>
  );
};

export default AndroidUpdateNotice;
