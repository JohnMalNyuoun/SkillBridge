import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import api from '../../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterCommunity, setFilterCommunity] = useState('');

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filterCommunity) params.communityType = filterCommunity;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterCommunity]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    setActionLoading(id);
    try {
      await api.put(`/admin/users/${id}/deactivate`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (id) => {
    setActionLoading(id);
    try {
      await api.put(`/admin/users/${id}/reactivate`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div className="fh-section-head">
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Youth Users
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            View and manage all registered youth on FursaHub
          </p>
        </div>
      </div>

      <div className="fh-container">

        {/* Filter */}
        <div style={{ marginBottom: '24px' }}>
          <select
            value={filterCommunity}
            onChange={(e) => setFilterCommunity(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              minWidth: '180px'
            }}
          >
            <option value="">All Communities</option>
            <option value="refugee">Refugee</option>
            <option value="host_community">Host Community</option>
          </select>
        </div>

        {users.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p>No users found</p>
          </div>
        ) : (
          <div>
            {users.map((user, i) => (
              <div key={user._id} style={{
                padding: '16px 20px',
                borderBottom: i < users.length - 1
                  ? '1px solid var(--border-color)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {user.photo ? (
                    <img
                      src={user.photo}
                      alt={user.fullName || 'Youth'}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.76rem'
                    }}>
                      {(user.fullName || 'Y').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      marginBottom: '2px'
                    }}>
                      <Link
                        to={`/profiles/youth/${user._id}`}
                        style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                      >
                        {user.fullName}
                      </Link>
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {user.email} · {user.communityType?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span className={`fh-badge fh-badge-${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>

                  {user.isActive ? (
                    <Button
                      variant="outline"
                      loading={actionLoading === user._id}
                      onClick={() => handleDeactivate(user._id)}
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      loading={actionLoading === user._id}
                      onClick={() => handleReactivate(user._id)}
                      style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;