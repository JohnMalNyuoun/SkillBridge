import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import api from '../../services/api';

const AdminNotifications = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const fetchNotifications = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        api.get('/admin/courses/stats'),
        api.get('/admin/organisations', { params: { status: 'pending' } })
      ]);

      const stats = statsRes?.data?.data || {};
      const pendingOrgs = pendingRes?.data?.data || [];

      const notifications = [];

      if ((stats.pendingOrganisations || 0) > 0) {
        notifications.push({
          id: 'pending-orgs',
          title: `${stats.pendingOrganisations} organisation request(s) pending review`,
          detail: 'Open organisations to approve or reject requests.',
          link: '/admin/organisations?status=pending'
        });
      }

      if ((stats.totalApplications || 0) > 0) {
        notifications.push({
          id: 'applications',
          title: `${stats.totalApplications} total application(s) on platform`,
          detail: 'Monitor courses and applicant activity.',
          link: '/admin/courses'
        });
      }

      pendingOrgs.slice(0, 4).forEach((org) => {
        notifications.push({
          id: `org-${org._id}`,
          title: `Pending organisation: ${org.name}`,
          detail: `${org.type || 'Organisation'} · ${org.location || 'N/A'}`,
          link: `/profiles/organisation/${org._id}`
        });
      });

      setItems(notifications);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
            Notifications
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Admin alerts and review reminders.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchNotifications}
          style={{
            background: 'var(--fb-blue)',
            color: 'var(--text-on-primary)',
            border: 'none',
            borderRadius: '999px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      <div className="fh-container">
        {items.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No notifications right now.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                style={{
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '10px'
                }}
              >
                <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.93rem', marginBottom: '4px' }}>
                  {item.title}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>{item.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
