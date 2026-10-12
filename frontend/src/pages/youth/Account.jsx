import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';
import {
  getYouthProfile,
  changeYouthName,
  changeYouthPassword,
  requestYouthPasswordChangeCode,
  requestYouthEmailChange,
  verifyYouthEmailChange
} from '../../services/profileService';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
  fontSize: '0.9rem'
};

const cardStyle = {
  padding: '0'
};

const YouthAccount = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [emailForm, setEmailForm] = useState({ newEmail: '', token: '' });
  const [nameForm, setNameForm] = useState({ newFullName: '', currentPassword: '' });
  const [activeEditor, setActiveEditor] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await getYouthProfile();
      setProfile(res.data);
      setNameForm((current) => ({
        ...current,
        newFullName: res.data.fullName || ''
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(window.location.search).get('verifyEmailToken');
    if (tokenFromUrl) {
      setEmailForm((current) => ({ ...current, token: tokenFromUrl }));
    }
  }, []);

  const requestEmailVerification = async () => {
    setError('');
    setNotice('');
    try {
      const res = await requestYouthEmailChange(emailForm.newEmail);
      if (!res.data.emailDeliveryConfigured) {
        setNotice('Email service is not configured yet. Configure SMTP to deliver verification links.');
      } else {
        setNotice('Verification link sent to the new email address.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification link');
    }
  };

  const saveNameChange = async () => {
    setError('');
    setNotice('');
    try {
      const res = await changeYouthName({
        newFullName: nameForm.newFullName,
        currentPassword: nameForm.currentPassword
      });

      const updatedName = res?.data?.fullName || nameForm.newFullName;
      setProfile((current) => ({ ...(current || {}), fullName: updatedName }));
      updateUser({ fullName: updatedName });
      setNameForm((current) => ({ ...current, currentPassword: '' }));
      setNotice('Name updated successfully. You can change it again after 30 days.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update name');
    }
  };

  const verifyEmailToken = async () => {
    setError('');
    setNotice('');
    try {
      await verifyYouthEmailChange(emailForm.token);
      await loadProfile();
      setEmailForm((current) => ({ ...current, token: '', newEmail: '' }));
      setNotice('Email updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify email token');
    }
  };

  const savePassword = async () => {
    setError('');
    setNotice('');
    try {
      await changeYouthPassword(passwordForm);
      setPasswordForm({ code: '', newPassword: '', confirmNewPassword: '' });
      setPasswordCodeSent(false);
      setNotice('Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const sendPasswordCode = async () => {
    setError('');
    setNotice('');
    try {
      await requestYouthPasswordChangeCode();
      setPasswordCodeSent(true);
      setNotice('A six-digit password-change code was sent to your email address.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send password-change code');
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
            onClick={() => navigate('/settings')}
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
            ← Back
          </button>
        </div>
      </div>

      <div className="fh-container" style={{ display: 'grid', gap: '10px' }}>
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

        <section style={cardStyle}>
          <button
            type="button"
            onClick={() => setActiveEditor((prev) => (prev === 'name' ? null : 'name'))}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Name</span>
            <span style={{ color: 'var(--fb-blue)', fontSize: '0.82rem', fontWeight: 700 }}>
              {activeEditor === 'name' ? 'Hide' : 'Edit'}
            </span>
          </button>

          {activeEditor === 'name' && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
                You can change your name once every 30 days. Enter your account password to confirm.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'block' }}>Current name</label>
                <input style={inputStyle} value={profile?.fullName || ''} readOnly />
              </div>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>New name</label>
                  <input
                    style={inputStyle}
                    value={nameForm.newFullName}
                    onChange={(e) => setNameForm((c) => ({ ...c, newFullName: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Account password</label>
                  <input
                    style={inputStyle}
                    type="password"
                    value={nameForm.currentPassword}
                    onChange={(e) => setNameForm((c) => ({ ...c, currentPassword: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={saveNameChange}>Save Name</Button>
              </div>
            </div>
          )}
        </section>

        <section style={{ ...cardStyle, paddingTop: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveEditor((prev) => (prev === 'email' ? null : 'email'))}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Email</span>
            <span style={{ color: 'var(--fb-blue)', fontSize: '0.82rem', fontWeight: 700 }}>
              {activeEditor === 'email' ? 'Hide' : 'Edit'}
            </span>
          </button>

          {activeEditor === 'email' && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
                Change your login email securely using a verification token.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'block' }}>Current email</label>
                <input style={inputStyle} value={profile?.email || ''} readOnly />
              </div>

              <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>New email address</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm((c) => ({ ...c, newEmail: e.target.value }))}
                  />
                </div>
                <Button onClick={requestEmailVerification}>Send Verification Link</Button>

                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Email verification token</label>
                  <input
                    style={inputStyle}
                    value={emailForm.token}
                    onChange={(e) => setEmailForm((c) => ({ ...c, token: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={verifyEmailToken}>Verify Email Change</Button>
              </div>
            </div>
          )}
        </section>

        <section style={{ ...cardStyle, paddingTop: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveEditor((prev) => (prev === 'password' ? null : 'password'))}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 12px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>Password</span>
            <span style={{ color: 'var(--fb-blue)', fontSize: '0.82rem', fontWeight: 700 }}>
              {activeEditor === 'password' ? 'Hide' : 'Edit'}
            </span>
          </button>

          {activeEditor === 'password' && (
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
                Request a six-digit code to your account email. The code expires in 10 minutes.
              </p>
              <Button variant="outline" onClick={sendPasswordCode}>Send Password Code</Button>
              {passwordCodeSent && <>
                <input
                  type="text"
                  placeholder="Six-digit email code"
                  style={inputStyle}
                  value={passwordForm.code}
                  onChange={(e) => setPasswordForm((c) => ({
                    ...c,
                    code: e.target.value.replace(/\D/g, '').slice(0, 6)
                  }))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              <input
                type="password"
                placeholder="New password"
                style={inputStyle}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((c) => ({ ...c, newPassword: e.target.value }))}
                minLength={6}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                style={inputStyle}
                value={passwordForm.confirmNewPassword}
                onChange={(e) => setPasswordForm((c) => ({ ...c, confirmNewPassword: e.target.value }))}
                minLength={6}
              />
              <Button variant="outline" onClick={savePassword}>Save Password</Button>
              </>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default YouthAccount;
