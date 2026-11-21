import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GoogleAuth = registerPlugin('GoogleAuth');
let googleScriptLoad;

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptLoad) return googleScriptLoad;

  googleScriptLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      googleScriptLoad = null;
      reject(new Error('Google sign-in could not be loaded. Please try again.'));
    };
    document.head.appendChild(script);
  });

  return googleScriptLoad;
};

const GoogleSignInButton = ({ onCredential, onError, disabled = false }) => {
  const buttonRef = useRef(null);
  const [nativeAndroid] = useState(
    () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const callbacksRef = useRef({ onCredential, onError });

  useEffect(() => {
    callbacksRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  const acceptCredential = useCallback(async (idToken) => {
    setLoading(true);
    setError('');
    try {
      await callbacksRef.current.onCredential(idToken);
    } catch (authError) {
      const message = authError.response?.data?.message
        || authError.message
        || 'Google sign-in failed. Please try again.';
      setError(message);
      callbacksRef.current.onError?.(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (nativeAndroid) return undefined;
    if (!clientId) return undefined;

    let active = true;
    const buttonElement = buttonRef.current;
    loadGoogleScript()
      .then(() => {
        if (!active || !buttonElement) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) {
              const message = 'Google did not return an ID token. Please try again.';
              setError(message);
              callbacksRef.current.onError?.(message);
              return;
            }
            await acceptCredential(credential);
          }
        });
        buttonElement.replaceChildren();
        window.google.accounts.id.renderButton(buttonElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(buttonElement.clientWidth || 360, 400)
        });
        setError('');
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message);
        callbacksRef.current.onError?.(loadError.message);
      });

    return () => {
      active = false;
      buttonElement?.replaceChildren();
    };
  }, [acceptCredential, clientId, nativeAndroid]);

  const handleNativeSignIn = async () => {
    if (disabled || loading) return;
    setLoading(true);
    setError('');
    try {
      if (!clientId) {
        throw new Error('Google sign-in is not configured for this app.');
      }
      const result = await GoogleAuth.signIn({ serverClientId: clientId });
      if (!result?.idToken) {
        throw new Error('Google did not return an ID token. Please try again.');
      }
      await onCredential(result.idToken);
    } catch (authError) {
      const message = authError.code === 'CANCELLED'
        ? 'Google sign-in was cancelled.'
        : authError.response?.data?.message
          || authError.message
          || 'Google sign-in failed. Please try again.';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '20px 0 16px' }}>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          color: 'var(--text-muted)',
          fontSize: '0.82rem'
        }}
      >
        <span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
        or continue with
        <span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
      </div>

      {nativeAndroid ? (
        <button
          type="button"
          onClick={handleNativeSignIn}
          disabled={disabled || loading}
          aria-busy={loading}
          style={{
            width: '100%',
            minHeight: '44px',
            border: '1px solid #747775',
            borderRadius: '4px',
            background: '#fff',
            color: '#1f1f1f',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: disabled || loading ? 'wait' : 'pointer',
            opacity: disabled || loading ? 0.65 : 1
          }}
        >
          {loading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
      ) : (
        <div
          ref={buttonRef}
          aria-busy={loading}
          aria-disabled={disabled || loading}
          style={{
            minHeight: '44px',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: disabled || loading ? 'none' : 'auto',
            opacity: disabled || loading ? 0.65 : 1
          }}
        />
      )}

      {loading && (
        <p role="status" style={{ textAlign: 'center', fontSize: '0.85rem' }}>
          Signing in...
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.85rem', marginTop: '8px' }}>
          {error}
        </p>
      )}
      {!clientId && !nativeAndroid && (
        <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.85rem', marginTop: '8px' }}>
          Google sign-in is not configured for this website.
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
