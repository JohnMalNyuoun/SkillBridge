import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { youthGoogleLogin, youthRegister } from '../../services/authService';
import useAuth from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { COMMUNITY_TYPES } from '../../utils/constants';

const YouthRegister = () => {
  const navigate = useNavigate();
  const { login, loading: sessionLoading } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    communityType: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleCredential = async (idToken) => {
    const response = await youthGoogleLogin(idToken);
    await login(response.data.user, response.data.token, response.data.refreshToken);
    navigate('/home');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sessionLoading) return;
    setError('');
    setLoading(true);

    try {
      const response = await youthRegister(form);
      await login(response.data.user, response.data.token, response.data.refreshToken);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
        maxWidth: '400px',
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
            SkillBridge
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '4px'
          }}>
            Your next opportunity starts here
          </p>
        </div>

        <h2 style={{
          fontSize: '1.15rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '24px'
        }}>
          Create your account
        </h2>

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

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            type="text"
            name="fullName"
            placeholder="Your full name"
            value={form.fullName}
            onChange={handleChange}
            required
          />
          <Input
            label="Email Address"
            type="email"
            name="email"
            placeholder="your@email.com"
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
            label="Date of Birth"
            type="date"
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={handleChange}
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
              Community Type
            </label>
            <select
              name="communityType"
              value={form.communityType}
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
              <option value="">Select community type</option>
              {COMMUNITY_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
          >
            Create Account
          </Button>
        </form>

        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onError={setError}
          disabled={loading || sessionLoading}
        />

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
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

export default YouthRegister;