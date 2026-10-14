import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { getAdminProfile, removeAdminPhoto, updateAdminPhoto } from '../../services/adminProfileService';
import { resolveImageUrl } from '../../utils/imageUrl';

const SETTINGS_KEY = 'fh_settings_admin_tab';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState(user);
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoInputRef = useRef(null);
  const [settings, setSettings] = useState(() => {
    const initialSettings = {
      theme: 'dark',
      language,
      alerts: {
        orgRequests: true,
        systemUpdates: true
      }
    };
    const saved = sessionStorage.getItem(SETTINGS_KEY);
    if (!saved) return initialSettings;

    try {
      const parsed = JSON.parse(saved);
      return {
        ...initialSettings,
        ...parsed,
        alerts: {
          ...initialSettings.alerts,
          ...(parsed.alerts || {})
        }
      };
    } catch (err) {
      console.error('Failed to parse admin settings', err);
      return initialSettings;
    }
  });
  const photoUrl = profile?.photo ? resolveImageUrl(profile.photo) : '';
  const versionedPhotoUrl = photoUrl
    ? `${photoUrl}${photoUrl.includes('?') ? '&' : '?'}v=${photoVersion}`
    : '';

  useEffect(() => {
    let cancelled = false;
    getAdminProfile()
      .then((response) => {
        if (!cancelled && response?.data) {
          setProfile(response.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPhotoError(
            err.response?.data?.message || 'Could not load the admin profile.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  const toggleAlert = (key) => {
    setSettings((current) => ({
      ...current,
      alerts: {
        ...current.alerts,
        [key]: !current.alerts[key]
      }
    }));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPG, PNG, or WEBP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('The profile picture must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    setPhotoBusy(true);
    try {
      const response = await updateAdminPhoto(formData);
      const photo = response?.data?.photo;
      if (!photo) throw new Error('The server did not return the uploaded photo.');
      setProfile((current) => ({ ...current, photo }));
      updateUser({ photo });
      setPhotoVersion(Date.now());
      setPhotoFailed(false);
      setNotice('Profile picture updated.');
    } catch (err) {
      setPhotoError(
        err.response?.data?.message || err.message || 'Could not update the profile picture.',
      );
    } finally {
      setPhotoBusy(false);
      event.target.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoError('');
    setNotice('');
    setPhotoBusy(true);
    try {
      const response = await removeAdminPhoto();
      if (response?.data?.photo !== null) {
        throw new Error('The server did not confirm that the profile picture was removed.');
      }
      setProfile((current) => ({ ...current, photo: null }));
      updateUser({ photo: null });
      setPhotoFailed(false);
      setNotice('Profile picture removed.');
    } catch (err) {
      setPhotoError(
        err.response?.data?.message || err.message || 'Could not remove the profile picture.',
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Do you want to log out?');
    if (!confirmed) return;
    logout();
    navigate('/login');
  };

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-section-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
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
            Admin controls and preferences.
          </p>
        </div>
      </div>

      <div className="fh-container" style={{ display: 'grid', gap: '16px' }}>
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
        {photoError && (
          <div role="alert" style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--danger-text)'
          }}>
            {photoError}
          </div>
        )}

        <section aria-label="Admin profile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          padding: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px'
        }}>
          <div style={{
            width: '112px',
            height: '112px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--fb-blue-subtle)',
            border: '2px solid var(--fb-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fb-blue)',
            fontSize: '2rem',
            fontWeight: 800
          }}>
            {versionedPhotoUrl && !photoFailed ? (
              <img
                src={versionedPhotoUrl}
                alt={`${profile?.fullName || 'Admin'} profile picture`}
                onError={() => setPhotoFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (profile?.fullName || 'A')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('')
            )}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              {profile?.fullName || user?.fullName || 'Admin User'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
              {profile?.email || user?.email || 'Administrator'}
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              aria-label="Choose profile picture"
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoBusy}
                style={{
                  padding: '9px 14px',
                  border: 'none',
                  borderRadius: '9px',
                  background: 'var(--fb-blue)',
                  color: 'var(--text-on-primary)',
                  fontWeight: 700,
                  cursor: photoBusy ? 'wait' : 'pointer',
                  opacity: photoBusy ? 0.65 : 1
                }}
              >
                {photoBusy ? 'Updating…' : profile?.photo ? 'Change picture' : 'Add picture'}
              </button>
              {profile?.photo && (
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  disabled={photoBusy}
                  style={{
                    padding: '9px 14px',
                    border: '1px solid var(--danger-primary)',
                    borderRadius: '9px',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger-text)',
                    fontWeight: 700,
                    cursor: photoBusy ? 'wait' : 'pointer',
                    opacity: photoBusy ? 0.65 : 1
                  }}
                >
                  Remove picture
                </button>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '8px 0 0' }}>
              JPG, PNG, or WEBP; up to 5 MB.
            </p>
          </div>
        </section>

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
            <label htmlFor="admin-language" style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>
              Language
            </label>
            <select
              id="admin-language"
              value={settings.language}
              onChange={(e) => {
                const lang = e.target.value;
                setSettings((current) => ({ ...current, language: lang }));
                setLanguage(lang);
                setNotice('Language updated.');
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
            Notifications
          </h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.alerts.orgRequests}
                onChange={() => toggleAlert('orgRequests')}
              />
              Pending organisation requests
            </label>
            <label style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.alerts.systemUpdates}
                onChange={() => toggleAlert('systemUpdates')}
              />
              System updates
            </label>
          </div>
        </section>

        <section style={{ padding: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>
            Shortcuts
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/admin/organisations" style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800, textDecoration: 'none' }}>
              Organisations
            </Link>
            <Link to="/admin/courses" style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800, textDecoration: 'none' }}>
              Courses
            </Link>
            <Link to="/admin/users" style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800, textDecoration: 'none' }}>
              Users
            </Link>
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

export default AdminSettings;
