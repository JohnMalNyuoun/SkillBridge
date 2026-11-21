import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const roleParam = searchParams.get('role');
  const initialRole = roleParam === 'admin' || roleParam === 'student' ? roleParam : 'student';

  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = location.state?.from?.pathname || null;

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register(form);
      const dest = redirectTo || (user.role === 'admin' ? '/dashboard' : '/journey');
      navigate(dest, { replace: true });
    } catch (e) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-lg">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm">
        <div className="mb-xl text-center">
          <h1 className="text-headline-lg font-headline-lg text-primary">Fursahub</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">Educational access for Kakuma</p>
        </div>

        <div className="flex gap-sm mb-lg bg-surface-container-low p-xs rounded-lg">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-sm rounded-lg text-label-md transition-colors ${
                mode === m ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-md">
          {mode === 'register' && (
            <>
              <Field label="Full name">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="I am a...">
                <select
                  value={form.role}
                  onChange={(e) => update('role', e.target.value)}
                  className="input"
                >
                  <option value="student">Student / Graduate</option>
                  <option value="admin">Organization Admin</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="input"
            />
          </Field>

          {err && (
            <div className="bg-error-container text-on-error-container text-body-sm p-md rounded-lg">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-on-primary py-sm rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-label-sm text-on-surface-variant text-center mt-lg">
          <Link to="/" className="hover:text-primary">Back to home</Link>
        </p>
      </div>

      <style>{`
        .input { width: 100%; padding: 8px 12px; border: 1px solid #c2c7d1; border-radius: 8px; background: #ffffff; font-size: 14px; }
        .input:focus { outline: none; box-shadow: 0 0 0 2px #00355f; border-color: transparent; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
