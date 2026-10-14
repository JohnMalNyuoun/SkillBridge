
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { youthLogin } from '../../services/authService';
import useAuth from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const YouthLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await youthLogin(form);
      login(res.data.user, res.data.token);
      if (res.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
      padding: '24px 16px',
      paddingBottom: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px 20px',
        marginTop: '24px'
      }}>
        {/* Logo */}
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
          Sign in to your account
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
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <Button
            type="submit"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
          >
            Sign In
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.88rem' }}>
          <Link to="/forgot-password" style={{ color: 'var(--fb-blue)', fontWeight: 700 }}>
            Forgot your password?
          </Link>
        </p>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            color: 'var(--fb-blue)',
            fontWeight: 700
          }}>
            Register here
          </Link>
        </p>

        <p style={{
          textAlign: 'center',
          marginTop: '12px',
          fontSize: '0.88rem',
          color: 'var(--text-muted)'
        }}>
          Are you an organisation?{' '}
          <Link to="/org/login" style={{
            color: 'var(--fb-blue)',
            fontWeight: 700
          }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default YouthLogin;