import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import api from '../../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [moderation, setModeration] = useState(null);
  const [posthog, setPosthog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/courses/stats');
        setStats(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    api.get('/admin/analytics/users')
      .then((res) => setAnalytics(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    api.get('/admin/analytics/moderation')
      .then((res) => setModeration(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    api.get('/admin/analytics/posthog')
      .then((res) => setPosthog(res.data.data))
      .catch((err) => {
        console.error(err);
        setPosthog({ configured: false, error: true });
      });
  }, []);

  if (loading) return <Loader />;

  const statCards = [
    { label: `Users (${stats?.totalYouth || 0})`, value: stats?.totalYouth, link: '/admin/users' },
    { label: `Organisations (${stats?.totalOrganisations || 0})`, value: stats?.totalOrganisations, link: '/admin/organisations' },
    { label: 'Pending Approval', value: stats?.pendingOrganisations, link: '/admin/organisations?status=pending' }
  ];

  const quickActions = [
    {
      title: 'Review Organisations',
      desc: 'Approve or reject pending organisations',
      link: '/admin/organisations',
      urgent: stats?.pendingOrganisations > 0
    },
    {
      title: 'Monitor Courses',
      desc: 'View and manage all posted courses',
      link: '/admin/courses',
      urgent: false
    },
    {
      title: `Youth Profiles (${stats?.totalYouth || 0})`,
      desc: 'View and manage all youth profiles',
      link: '/admin/users',
      urgent: false
    },
    {
      title: `Organisations (${stats?.totalOrganisations || 0})`,
      desc: 'View and manage organisation profiles',
      link: '/admin/organisations',
      urgent: false
    }
  ];

  const q = searchTerm.trim().toLowerCase();
  const filteredStatCards = q
    ? statCards.filter((item) => item.label.toLowerCase().includes(q))
    : statCards;
  const filteredActions = q
    ? quickActions.filter((item) => `${item.title} ${item.desc}`.toLowerCase().includes(q))
    : quickActions;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--fb-blue-subtle) 100%)',
        padding: '32px 20px 36px'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 5vw, 1.6rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            letterSpacing: '-0.3px'
          }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Platform overview and management
          </p>
        </div>
      </div>

      <div className="fh-container">

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search dashboard"
            style={{
              flex: '1 1 260px',
              maxWidth: '420px',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-section-alt)',
              color: 'var(--text-primary)'
            }}
          />
          <button
            type="button"
            onClick={() => setSearchTerm(searchInput)}
            style={{
              background: 'var(--fb-blue)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '999px',
              padding: '10px 14px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
          <Link
            to="/admin/settings"
            style={{
              color: 'var(--fb-blue)',
              fontSize: '0.86rem',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            Menu: Settings
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gap: '10px', marginBottom: '28px' }}>
          {filteredStatCards.map((stat, i) => (
            <Link key={i} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={{
                borderBottom: stat.label === 'Pending Approval' && stats?.pendingOrganisations > 0
                  ? '1px solid var(--fb-blue)' : '1px solid var(--border-color)',
                padding: '10px 0',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer'
              }}>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--fb-blue)'
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  textAlign: 'right'
                }}>
                  {stat.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* User Activity */}
        <UserActivityPanel analytics={analytics} />

        {/* Moderation Activity */}
        <ModerationPanel moderation={moderation} />

        {/* PostHog Insights */}
        <PostHogPanel posthog={posthog} />

        {/* Quick Actions */}
        <div>
          <h2 style={{
            fontSize: '1.2rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '20px'
          }}>
            Quick Actions
          </h2>

          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredActions.map((action, i) => (
              <Link key={i} to={action.link} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderBottom: `1px solid ${action.urgent ? 'var(--fb-blue)' : 'var(--border-color)'}`,
                  padding: '10px 0',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}>
                  <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginBottom: '6px'
                  }}>
                    {action.title}
                    {action.urgent && (
                      <span style={{
                        marginLeft: '8px',
                        background: 'var(--fb-blue)',
                        color: 'var(--text-on-primary)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '20px'
                      }}>
                        Action needed
                      </span>
                    )}
                  </h3>
                  <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}>
                    {action.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TOKENS = {
  surface: 'var(--bg-card)',
  surfaceMuted: 'var(--bg-base)',
  border: 'var(--border-color)',
  borderStrong: 'var(--fb-blue)',
  textPrimary: 'var(--text-primary)',
  textMuted: 'var(--text-secondary)',
  textDim: 'var(--text-muted)',
  accent: 'var(--fb-blue)',
  success: 'var(--success-primary)',
  danger: 'var(--danger-primary)',
  radius: '8px'
};

const TREND_GLYPH = {
  up: { icon: '↑', color: TOKENS.success, label: 'Increasing' },
  down: { icon: '↓', color: TOKENS.danger, label: 'Declining' },
  steady: { icon: '–', color: TOKENS.textDim, label: 'Steady' }
};

const TrendBadge = ({ trend }) => {
  const t = TREND_GLYPH[trend?.direction] || TREND_GLYPH.steady;
  const pct = typeof trend?.changePct === 'number' ? trend.changePct : 0;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      color: t.color,
      fontSize: '0.74rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      <span>{t.icon}</span>
      <span>{pct > 0 ? `+${pct}` : pct}%</span>
      <span style={{ color: TOKENS.textDim, fontWeight: 600 }}>{t.label}</span>
    </span>
  );
};

const MetricTile = ({ label, value, sub, trend }) => (
  <div style={{
    background: TOKENS.surface,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radius,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '108px'
  }}>
    <div style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      color: TOKENS.textDim,
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }}>
      {label}
    </div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.accent, lineHeight: 1 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: '0.76rem', color: TOKENS.textMuted }}>
        {sub}
      </div>
    )}
    {trend && <TrendBadge trend={trend} />}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={{
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px 0',
    borderBottom: `1px solid ${TOKENS.border}`
  }}>
    <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>{value}</span>
  </div>
);

const SubPanel = ({ title, children }) => (
  <div style={{
    background: TOKENS.surface,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: TOKENS.radius,
    padding: '14px 16px'
  }}>
    <div style={{
      fontSize: '0.78rem',
      fontWeight: 800,
      color: TOKENS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '8px'
    }}>
      {title}
    </div>
    {children}
  </div>
);

const UserActivityPanel = ({ analytics }) => {
  const heading = (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '1.05rem',
        fontWeight: 800,
        color: TOKENS.textPrimary,
        margin: 0,
        letterSpacing: '-0.2px'
      }}>
        User Activity
      </h2>
      <p style={{ fontSize: '0.8rem', color: TOKENS.textDim, marginTop: '4px' }}>
        Growth, logins, applications and outbound shares.
      </p>
    </div>
  );

  if (!analytics) {
    return (
      <div style={{ marginBottom: '28px' }}>
        {heading}
        <div style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radius,
          padding: '16px',
          color: TOKENS.textDim,
          fontSize: '0.86rem'
        }}>
          Loading metrics…
        </div>
      </div>
    );
  }

  const { users, logins, applications, shares } = analytics;

  return (
    <div style={{ marginBottom: '28px' }}>
      {heading}

      {/* Top row: primary metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <MetricTile
          label="Total users"
          value={users?.total ?? 0}
          sub={`${users?.newLast7d ?? 0} new · last 7d`}
          trend={users?.trend}
        />
        <MetricTile
          label="Active · 24h"
          value={logins?.last24h ?? 0}
          sub={`7d: ${logins?.last7d ?? 0} · 30d: ${logins?.last30d ?? 0}`}
        />
        <MetricTile
          label="Applications"
          value={applications?.total ?? 0}
          sub={`${applications?.last7d ?? 0} · last 7d`}
          trend={applications?.trend}
        />
        <MetricTile
          label="Shares out"
          value={shares?.total ?? 0}
          sub={`${shares?.last7d ?? 0} · last 7d`}
          trend={shares?.trend}
        />
      </div>

      {/* Secondary row: breakdowns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '10px'
      }}>
        <SubPanel title="Login activity">
          <InfoRow label="Last 24 hours" value={logins?.last24h ?? 0} />
          <InfoRow label="Last 7 days" value={logins?.last7d ?? 0} />
          <InfoRow label="Last 30 days" value={logins?.last30d ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Never logged in</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>
              {logins?.neverLoggedIn ?? 0}
            </span>
          </div>
        </SubPanel>

        <SubPanel title="Growth window">
          <InfoRow label="New users · last 7d" value={users?.newLast7d ?? 0} />
          <InfoRow label="New users · prev 7d" value={users?.newPrev7d ?? 0} />
          <InfoRow label="Apps · last 7d" value={applications?.last7d ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Apps · prev 7d</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>
              {applications?.prev7d ?? 0}
            </span>
          </div>
        </SubPanel>

        <SubPanel title="Top share destinations">
          {Array.isArray(shares?.byTarget) && shares.byTarget.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {shares.byTarget.map((row) => (
                <span key={row.target} style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: TOKENS.textMuted,
                  background: TOKENS.surfaceMuted,
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: '999px',
                  padding: '4px 10px'
                }}>
                  {row.target} · <span style={{ color: TOKENS.accent }}>{row.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>
              No shares recorded yet.
            </div>
          )}
        </SubPanel>
      </div>
    </div>
  );
};

const formatWhen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

const ModerationPanel = ({ moderation }) => {
  const heading = (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '1.05rem',
        fontWeight: 800,
        color: TOKENS.textPrimary,
        margin: 0,
        letterSpacing: '-0.2px'
      }}>
        Organisation Moderation
      </h2>
      <p style={{ fontSize: '0.8rem', color: TOKENS.textDim, marginTop: '4px' }}>
        Approvals, suspensions and reinstatement requests.
      </p>
    </div>
  );

  if (!moderation) {
    return (
      <div style={{ marginBottom: '28px' }}>
        {heading}
        <div style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radius,
          padding: '16px',
          color: TOKENS.textDim,
          fontSize: '0.86rem'
        }}>
          Loading metrics…
        </div>
      </div>
    );
  }

  const { orgs, approvals, suspensions, recent } = moderation;

  return (
    <div style={{ marginBottom: '28px' }}>
      {heading}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <MetricTile
          label="Pending review"
          value={orgs?.byStatus?.pending ?? 0}
          sub={`${orgs?.total ?? 0} total orgs`}
        />
        <MetricTile
          label="Approved · 7d"
          value={approvals?.last7d ?? 0}
          sub={`prev 7d: ${approvals?.prev7d ?? 0}`}
          trend={approvals?.trend}
        />
        <MetricTile
          label="Suspended · 7d"
          value={suspensions?.last7d ?? 0}
          sub={`prev 7d: ${suspensions?.prev7d ?? 0}`}
          trend={suspensions?.trend}
        />
        <MetricTile
          label="Reinstatement pending"
          value={orgs?.pendingReinstatement ?? 0}
          sub={`${orgs?.byStatus?.suspended ?? 0} suspended`}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '10px'
      }}>
        <SubPanel title="Status breakdown">
          <InfoRow label="Pending" value={orgs?.byStatus?.pending ?? 0} />
          <InfoRow label="Approved" value={orgs?.byStatus?.approved ?? 0} />
          <InfoRow label="Rejected" value={orgs?.byStatus?.rejected ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Suspended</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>
              {orgs?.byStatus?.suspended ?? 0}
            </span>
          </div>
        </SubPanel>

        <SubPanel title="Recently approved">
          {Array.isArray(recent?.approved) && recent.approved.length > 0 ? (
            recent.approved.map((row) => (
              <InfoRow key={row.id} label={row.name} value={formatWhen(row.at)} />
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>No approvals yet.</div>
          )}
        </SubPanel>

        <SubPanel title="Recently suspended">
          {Array.isArray(recent?.suspended) && recent.suspended.length > 0 ? (
            recent.suspended.map((row) => (
              <InfoRow key={row.id} label={row.name} value={formatWhen(row.at)} />
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>No suspensions yet.</div>
          )}
        </SubPanel>
      </div>
    </div>
  );
};

const PostHogPanel = ({ posthog }) => {
  const heading = (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '1.05rem',
        fontWeight: 800,
        color: TOKENS.textPrimary,
        margin: 0,
        letterSpacing: '-0.2px'
      }}>
        PostHog Insights
      </h2>
      <p style={{ fontSize: '0.8rem', color: TOKENS.textDim, marginTop: '4px' }}>
        Live event data from PostHog &middot; last 14&ndash;30 days.
      </p>
    </div>
  );

  if (!posthog) {
    return (
      <div style={{ marginBottom: '28px' }}>
        {heading}
        <div style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radius,
          padding: '16px',
          color: TOKENS.textDim,
          fontSize: '0.86rem'
        }}>
          Loading metrics&hellip;
        </div>
      </div>
    );
  }

  if (!posthog.configured) {
    return (
      <div style={{ marginBottom: '28px' }}>
        {heading}
        <div style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radius,
          padding: '16px',
          color: TOKENS.textMuted,
          fontSize: '0.86rem'
        }}>
          {posthog.error
            ? 'PostHog query failed. Check the backend logs.'
            : (posthog.hint || 'Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY in Backend/.env to enable live PostHog insights.')}
        </div>
      </div>
    );
  }

  const { dailyEvents = [], topCourses = [], conversion = {}, topAdmins = [] } = posthog;

  const totals = dailyEvents.reduce((acc, row) => {
    acc[row.event] = (acc[row.event] || 0) + (row.count || 0);
    return acc;
  }, {});

  return (
    <div style={{ marginBottom: '28px' }}>
      {heading}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '12px'
      }}>
        <MetricTile
          label="Org regs · 14d"
          value={totals['org registered'] || 0}
          sub="event: org registered"
        />
        <MetricTile
          label="Youth regs · 14d"
          value={totals['youth registered'] || 0}
          sub="event: youth registered"
        />
        <MetricTile
          label="Course views · 14d"
          value={totals['course viewed'] || 0}
          sub="event: course viewed"
        />
        <MetricTile
          label="View to apply"
          value={`${conversion.ratePct ?? 0}%`}
          sub={`${conversion.applies ?? 0} / ${conversion.views ?? 0} · 30d`}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '10px'
      }}>
        <SubPanel title="Top courses by views (30d)">
          {topCourses.length > 0 ? (
            topCourses.map((row, i) => (
              <InfoRow key={`${row.course}-${i}`} label={row.course} value={row.views} />
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>
              No course-view events yet.
            </div>
          )}
        </SubPanel>

        <SubPanel title="Most active admins (30d)">
          {topAdmins.length > 0 ? (
            topAdmins.map((row, i) => (
              <InfoRow key={`${row.email}-${i}`} label={row.email} value={`${row.actions} actions`} />
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>
              No admin moderation events yet.
            </div>
          )}
        </SubPanel>

        <SubPanel title="Apply funnel (30d)">
          <InfoRow label="Course views" value={conversion.views ?? 0} />
          <InfoRow label="Applications" value={conversion.applies ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Conversion</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.accent, fontWeight: 800 }}>
              {conversion.ratePct ?? 0}%
            </span>
          </div>
        </SubPanel>
      </div>
    </div>
  );
};

export default Dashboard;