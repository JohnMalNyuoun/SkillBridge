import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  getYouthProfile,
  updateYouthTheme
} from '../../services/profileService';

const YouthSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [failedPhotoSrc, setFailedPhotoSrc] = useState('');
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  const [preferences, setPreferences] = useState({
    theme: 'light'
  });

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => getYouthProfile())
      .then((res) => {
        if (!active) return;
        setProfile(res.data);
        setPreferences({ theme: res.data.theme || 'light' });
        document.documentElement.setAttribute('data-theme', res.data.theme || 'light');
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load menu');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const profilePhotoSrc = useMemo(() => {
    if (!profile?.photo) return '';
    const version = profile?.updatedAt ? encodeURIComponent(profile.updatedAt) : '';
    if (!version) return profile.photo;
    const separator = profile.photo.includes('?') ? '&' : '?';
    return `${profile.photo}${separator}v=${version}`;
  }, [profile?.photo, profile?.updatedAt]);
  const resolvedProfilePhotoSrc = resolveImageUrl(profilePhotoSrc);

  const toggleTheme = async () => {
    setError('');
    setNotice('');
    try {
      const nextTheme = preferences.theme === 'dark' ? 'light' : 'dark';
      await updateYouthTheme(nextTheme);
      setPreferences((current) => ({ ...current, theme: nextTheme }));
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update theme');
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Do you want to log out?');
    if (!confirmed) return;
    logout();
    navigate('/login');
  };

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-section-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/home')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fb-blue)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>

      <div className="fh-container" style={{ display: 'grid', gap: '16px' }}>

        {/* Profile card - click to go to full profile page */}
        <Link
          to="/profile"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'none'
            }}
          >
            {profilePhotoSrc && failedPhotoSrc !== resolvedProfilePhotoSrc ? (
              <img
                src={resolvedProfilePhotoSrc}
                alt={profile?.fullName}
                onError={() => setFailedPhotoSrc(resolvedProfilePhotoSrc)}
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--fb-blue)' }}
              />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--fb-blue)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0, border: '2px solid var(--fb-blue)' }}>
                {(profile?.fullName || 'YU').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text-primary)', fontSize: '1.08rem', fontWeight: 800, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.fullName || 'Your Name'}
              </p>
              <p style={{ color: 'var(--fb-blue)', fontSize: '0.78rem', fontWeight: 700, marginTop: '2px' }}>View profile →</p>
            </div>
          </div>
        </Link>

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

        <section style={{ padding: '0' }}>
          <Link to="/account" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>
                  Account
                </h2>
              </div>
              <span style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                Open →
              </span>
            </div>
          </Link>
        </section>

        <section style={{ padding: '0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              {preferences.theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>

            <button
              type="button"
              onClick={toggleTheme}
              role="switch"
              aria-checked={preferences.theme === 'dark'}
              aria-label="Switch theme"
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: preferences.theme === 'dark' ? 'var(--fb-blue)' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  transform: preferences.theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease'
                }}
              />
            </button>
          </div>
        </section>

        <section style={{ padding: '0' }}>
          <Link to="/quick-access" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                Quick Access
              </h2>
              <span style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                Open →
              </span>
            </div>
          </Link>
        </section>

        <div style={{ paddingTop: '6px' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--fb-blue)',
              color: 'var(--fb-blue)',
              background: 'transparent',
              borderRadius: '10px',
              padding: '10px 14px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Log Out
          </button>
        </div>

      </div>

      {showPhotoPreview && (
        <div
          onClick={() => setShowPhotoPreview(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '16px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            {profile?.photo && failedPhotoSrc !== resolvedProfilePhotoSrc ? (
              <img
                src={resolvedProfilePhotoSrc}
                alt={profile?.fullName || 'Profile photo'}
                onError={() => setFailedPhotoSrc(resolvedProfilePhotoSrc)}
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '10px' }}
              />
            ) : (
              <div style={{
                width: '220px',
                height: '220px',
                margin: '0 auto',
                borderRadius: '50%',
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '3rem'
              }}>
                {(profile?.fullName || 'YU').slice(0, 2).toUpperCase()}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPhotoPreview(false)}
              style={{
                marginTop: '12px',
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouthSettings;
