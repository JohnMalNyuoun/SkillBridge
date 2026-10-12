import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  orgRegister,
  resendRegistrationCode,
  verifyRegistrationEmail
} from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { ORG_TYPES } from '../../utils/constants';

const OrgRegister = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    type: '',
    description: '',
    phoneNumber: '',
    location: 'Kakuma',
    website: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await orgRegister(form);
      setAwaitingVerification(true);
      setVerificationCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyRegistrationEmail({
        email: form.email,
        accountType: 'organisation',
        code: verificationCode
      });
      setAwaitingVerification(false);
      setSuccess('Email verified. Your organisation registration is awaiting admin approval.');
    } catch (err) {
      setError(err.response?.data?.message || 'Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await resendRegistrationCode({ email: form.email, accountType: 'organisation' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend verification code');
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
      <div style={{
        width: '100%',
        maxWidth: '480px',
        padding: '32px 20px',
        marginTop: '24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: 'var(--fb-blue)',
            letterSpacing: '-0.5px'
          }}>
            FursaHub
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '4px'
          }}>
            Organisation Portal
          </p>
        </div>

        <h2 style={{
          fontSize: '1.15rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          Register your organisation
        </h2>

        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginBottom: '24px'
        }}>
          Your account will be reviewed and approved by FursaHub admin before you can post courses.
        </p>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            borderLeft: '4px solid var(--danger-primary)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'var(--fb-blue-subtle)',
            borderLeft: '4px solid var(--fb-blue)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            color: 'var(--fb-blue)'
          }}>
            {success}
            <br />
            <Link to="/org/login" style={{
              color: 'var(--fb-blue)',
              fontWeight: 700,
              marginTop: '8px',
              display: 'inline-block'
            }}>
              Go to login
            </Link>
          </div>
        )}

        {!success && !awaitingVerification && (
          <form onSubmit={handleSubmit}>
            <Input
              label="Organisation Name"
              type="text"
              name="name"
              placeholder="e.g. K-Node Kakuma"
              value={form.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="organisation@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <Input
              label="Phone Number"
              type="text"
              name="phoneNumber"
              placeholder="+254700000000"
              value={form.phoneNumber}
              onChange={handleChange}
              required
            />

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Organisation Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                }}
              >
                <option value="">Select organisation type</option>
                {ORG_TYPES.map(ot => (
                  <option key={ot.value} value={ot.value}>
                    {ot.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Brief description of your organisation and what you do in Kakuma"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  resize: 'vertical'
                }}
              />
            </div>

            <Input
              label="Location"
              type="text"
              name="location"
              placeholder="Kakuma"
              value={form.location}
              onChange={handleChange}
            />

            <Input
              label="Website (optional)"
              type="text"
              name="website"
              placeholder="https://yourwebsite.com"
              value={form.website}
              onChange={handleChange}
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              style={{ marginTop: '8px' }}
            >
              Submit Registration
            </Button>
          </form>
        )}

        {awaitingVerification && (
          <form onSubmit={handleVerify}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter the six-digit code sent to {form.email}. The code expires in 10 minutes.
            </p>
            <Input
              label="Email verification code"
              type="text"
              name="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
            <Button type="submit" fullWidth loading={loading}>Verify Email</Button>
            <Button type="button" variant="outline" fullWidth onClick={handleResend} disabled={loading}>
              Resend Code
            </Button>
          </form>
        )}

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)'
        }}>
          Already registered?{' '}
          <Link to="/org/login" style={{
            color: 'var(--fb-blue)',
            fontWeight: 700
          }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default OrgRegister;