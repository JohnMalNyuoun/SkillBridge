import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { requestPasswordReset, resetPassword } from '../../services/authService';

const PasswordRecovery = ({ accountType, loginPath }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [step, setStep] = useState('request');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await requestPasswordReset({ email, accountType });
      setStep('reset');
      setNotice(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not request a password reset code');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({
        email,
        accountType,
        code,
        newPassword,
        confirmNewPassword
      });
      setStep('done');
      setNotice(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await requestPasswordReset({ email, accountType });
      setNotice(response.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the password reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, var(--bg-base) 0%, var(--fb-blue-subtle) 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '32px 20px', marginTop: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--fb-blue)' }}>SkillBridge</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Reset your password</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            borderLeft: '4px solid var(--danger-primary)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-primary)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: 'var(--success-text)'
          }}>
            {notice}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={sendCode}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading}>Send Reset Code</Button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={savePassword}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              If an account matches this email, a six-digit code has been sent. It expires in 10 minutes.
            </p>
            <Input
              label="Six-digit code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              minLength={6}
              required
            />
            <Button type="submit" fullWidth loading={loading}>Reset Password</Button>
            <Button type="button" variant="outline" fullWidth onClick={resendCode} disabled={loading}>
              Resend Code
            </Button>
          </form>
        )}

        {step === 'done' && (
          <Link to={loginPath} style={{ color: 'var(--fb-blue)', fontWeight: 700 }}>
            Return to sign in
          </Link>
        )}
        {step !== 'done' && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)' }}>
            <Link to={loginPath} style={{ color: 'var(--fb-blue)', fontWeight: 700 }}>Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default PasswordRecovery;
