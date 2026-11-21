import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('fursahub_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  function persist(token, u) {
    localStorage.setItem('fursahub_token', token);
    localStorage.setItem('fursahub_user', JSON.stringify(u));
    setUser(u);
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', payload);
      persist(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('fursahub_token');
    localStorage.removeItem('fursahub_user');
    setUser(null);
  }

  useEffect(() => {
    if (!user) return;
    api.get('/auth/me').then(({ data }) => {
      if (data?.user) {
        localStorage.setItem('fursahub_user', JSON.stringify(data.user));
        setUser(data.user);
      }
    }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
