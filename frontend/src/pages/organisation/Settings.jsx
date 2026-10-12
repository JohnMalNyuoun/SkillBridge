import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import {
  changeOrgPassword,
  getOrgProfile,
  requestOrgPasswordChangeCode,
  updateOrgLanguage
} from '../../services/profileService';
import { useLanguage } from '../../hooks/useLanguage';

const SETTINGS_KEY = 'fh_settings_org_tab';

const OrgSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [settings, setSettings] = useState({
    theme: 'dark',
    language,
    privacy: {
      profileVisible: true,
      activityVisible: true
    }
  });

  useEffect(() => {
    const saved = sessionStorage.getItem(SETTINGS_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setSettings((current) => ({
        ...current,
        ...parsed,
        privacy: {
          ...current.privacy,
          ...(parsed.privacy || {})
        }
      }));
    } catch (err) {
      console.error('Failed to parse organisation settings', err);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getOrgProfile();
        setProfile(res.data);
        if (res.data?.language) {
          setSettings((current) => ({ ...current, language: res.data.language }));
          setLanguage(res.data.language);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setLanguage]);

  const updatePrivacy = (key, value) => {
    setSettings((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        [key]: value
      }
    }));
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Do you want to log out?');
    if (!confirmed) return;
    logout();
    navigate('/org/login');
  };

  const sendPasswordCode = async () => {
    setError('');
    setNotice('');
    try {
      await requestOrgPasswordChangeCode();
      setPasswordCodeSent(true);
      setNotice('A six-digit password-change code was sent to your organisation email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send password-change code');
    }
  };

  const savePassword = async () => {
    setError('');
    setNotice('');
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    try {
      const response = await changeOrgPassword(passwordForm);
      setPasswordForm({ code: '', newPassword: '', confirmNewPassword: '' });
      setPasswordCodeSent(false);
      setNotice(response.message || 'Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-section-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/org/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fb-blue)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '6px'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Settings
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Manage your organisation account and preferences.
          </p>
        </div>
      </div>

      <div className="fh-container" style={{ display: 'grid', gap: '16px' }}>
        <Link to="/org/profile" style={{ textDecoration: 'none' }}>
          <section style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>
                Organisation Profile
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {profile?.name || 'Organisation'}
              </p>
            </div>
            <span style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800 }}>Open →</span>
          </section>
        </Link>

        <section style={{ padding: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>
            Change password
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Request a six-digit code to your organisation email. The code expires in 10 minutes.
          </p>
          <button
            type="button"
            onClick={sendPasswordCode}
            style={{
              padding: '10px 14px',
              background: 'var(--fb-blue)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-on-primary)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Send Password Code
          </button>
          {passwordCodeSent && (
            <div style={{ display: 'grid', gap: '10px', maxWidth: '400px', marginTop: '14px' }}>
              <input
                aria-label="Six-digit email code"
                placeholder="Six-digit email code"
                value={passwordForm.code}
                onChange={(e) => setPasswordForm((current) => ({
                  ...current,
                  code: e.target.value.replace(/\D/g, '').slice(0, 6)
                }))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px'
                }}
              />
              <input
                aria-label="New password"
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                minLength={6}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px'
                }}
              />
              <input
                aria-label="Confirm new password"
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmNewPassword}
                onChange={(e) => setPasswordForm((current) => ({ ...current, confirmNewPassword: e.target.value }))}
                minLength={6}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px'
                }}
              />
              <button
                type="button"
                onClick={savePassword}
                style={{
                  padding: '10px 14px',
                  background: 'var(--fb-blue)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-on-primary)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Save Password
              </button>
            </div>
          )}
        </section>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--success-text)'
          }}>
            {notice}
          </div>
        )}

        <section style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              {settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSettings((current) => ({
                  ...current,
                  theme: current.theme === 'dark' ? 'light' : 'dark'
                }));
                setNotice('Theme updated.');
              }}
              role="switch"
              aria-checked={settings.theme === 'dark'}
              aria-label="Switch theme"
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '999px',
                border: 'none',
                background: settings.theme === 'dark' ? 'var(--fb-blue)' : 'var(--text-muted)',
                padding: '2px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: settings.theme === 'dark' ? 'flex-end' : 'flex-start'
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  display: 'block'
                }}
              />
            </button>
          </div>
        </section>

        <section style={{ padding: 0 }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label htmlFor="org-language" style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>
              {t('profile.language')}
            </label>
            <select
              id="org-language"
              value={settings.language}
              onChange={async (e) => {
                const lang = e.target.value;
                setNotice('');
                setError('');
                setSettings((current) => ({ ...current, language: lang }));
                setLanguage(lang);

                try {
                  await updateOrgLanguage(lang);
                  setNotice('Language updated.');
                } catch (err) {
                  setError(err.response?.data?.message || 'Failed to update language');
                }
              }}
              style={{
                width: '220px',
                padding: '10px 12px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px'
              }}
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </section>

        <section style={{ padding: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
            {t('profile.privacy')}
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.privacy.profileVisible}
                onChange={(e) => updatePrivacy('profileVisible', e.target.checked)}
              />
              {t('profile.profileVisibility')}
            </label>
            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.privacy.activityVisible}
                onChange={(e) => updatePrivacy('activityVisible', e.target.checked)}
              />
              {t('profile.activityVisibility')}
            </label>
          </div>
        </section>

        <section style={{ padding: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '10px' }}>
            {t('profile.helpSupport')}
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="mailto:support@fursahub.org"
              style={{
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 800,
                textDecoration: 'none'
              }}
            >
              {t('profile.contactUs')}
            </a>
            <a
              href="https://fursahub.onrender.com"
              target="_blank"
              rel="noreferrer"
              style={{
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              {t('profile.tutorials')}
            </a>
          </div>
        </section>

        <section style={{ padding: 0 }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--danger-primary)',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Log Out
          </button>
        </section>
      </div>
    </div>
  );
};

export default OrgSettings;