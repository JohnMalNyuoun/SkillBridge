import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getOrgCourses } from '../../services/courseService';
import { getOrgApplications } from '../../services/applicationService';
import useAuth from '../../hooks/useAuth';

const dayMs = 24 * 60 * 60 * 1000;

const trendOf = (current, previous) => {
  if (!previous) {
    if (!current) return { direction: 'steady', changePct: 0 };
    return { direction: 'up', changePct: 100 };
  }
  const diff = current - previous;
  const changePct = Math.round((diff / previous) * 100);
  if (changePct > 2) return { direction: 'up', changePct };
  if (changePct < -2) return { direction: 'down', changePct };
  return { direction: 'steady', changePct };
};

const Dashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, appsRes] = await Promise.all([
          getOrgCourses(),
          getOrgApplications()
        ]);
        setCourses(coursesRes.data || []);
        setApplications(appsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  const now = Date.now();
  const window7Start = now - (7 * dayMs);
  const window14Start = now - (14 * dayMs);

  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.status === 'published').length;
  const draftCourses = courses.filter((c) => c.status === 'draft').length;
  const closedCourses = courses.filter((c) => c.status === 'closed' || c.status === 'cancelled').length;

  const totalApplications = applications.length;
  const pendingApplications = applications.filter((a) => a.status === 'submitted').length;
  const shortlistedApplications = applications.filter((a) => a.status === 'shortlisted').length;
  const acceptedApplications = applications.filter((a) => a.status === 'accepted').length;
  const rejectedApplications = applications.filter((a) => a.status === 'rejected').length;

  const appsLast7d = applications.filter((a) => {
    const ts = new Date(a.createdAt).getTime();
    return ts >= window7Start;
  }).length;
  const appsPrev7d = applications.filter((a) => {
    const ts = new Date(a.createdAt).getTime();
    return ts >= window14Start && ts < window7Start;
  }).length;

  const acceptedLast7d = applications.filter((a) => {
    const ts = new Date(a.updatedAt || a.createdAt).getTime();
    return a.status === 'accepted' && ts >= window7Start;
  }).length;
  const acceptedPrev7d = applications.filter((a) => {
    const ts = new Date(a.updatedAt || a.createdAt).getTime();
    return a.status === 'accepted' && ts >= window14Start && ts < window7Start;
  }).length;

  const conversionRate = totalApplications > 0
    ? Math.round((acceptedApplications / totalApplications) * 100)
    : 0;

  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((a) => ({
      id: a._id,
      applicant: a.youth?.fullName || a.user?.fullName || 'Applicant',
      courseTitle: a.course?.title || 'Course',
      status: a.status || 'submitted'
    }));

  const statCards = [
    { label: `Courses (${totalCourses})`, value: totalCourses, link: '/org/courses' },
    { label: `Applications (${totalApplications})`, value: totalApplications, link: '/org/applications' },
    { label: 'Pending Review', value: pendingApplications, link: '/org/applications?status=submitted' }
  ];

  const quickActions = [
    {
      title: 'Review Applications',
      desc: 'Shortlist, accept or reject applicants',
      link: '/org/applications',
      urgent: pendingApplications > 0
    },
    {
      title: 'Manage Courses',
      desc: 'Create, edit, publish and close courses',
      link: '/org/courses',
      urgent: false
    },
    {
      title: 'Course Analytics',
      desc: 'Track course and application performance',
      link: '/org/analytics',
      urgent: false
    },
    {
      title: 'Organisation Profile',
      desc: 'Update your organisation information',
      link: '/org/profile',
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

  const analytics = {
    courses: {
      total: totalCourses,
      published: publishedCourses,
      drafts: draftCourses,
      closed: closedCourses
    },
    applications: {
      total: totalApplications,
      pending: pendingApplications,
      shortlisted: shortlistedApplications,
      accepted: acceptedApplications,
      rejected: rejectedApplications,
      last7d: appsLast7d,
      prev7d: appsPrev7d,
      trend: trendOf(appsLast7d, appsPrev7d)
    },
    outcomes: {
      conversionRate,
      acceptedLast7d,
      acceptedPrev7d,
      trend: trendOf(acceptedLast7d, acceptedPrev7d)
    },
    recentApplications
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

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
            Organisation Dashboard
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Hello {user?.name || 'Organisation'} - manage courses and applications in one place.
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
            to="/org/settings"
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

        <div style={{ display: 'grid', gap: '10px', marginBottom: '28px' }}>
          {filteredStatCards.map((stat, i) => (
            <Link key={i} to={stat.link} style={{ textDecoration: 'none' }}>
              <div style={{
                borderBottom: stat.label === 'Pending Review' && pendingApplications > 0
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

        <OrgActivityPanel analytics={analytics} />

        <div>
          <h2 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
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
                    fontWeight: 700,
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

const OrgActivityPanel = ({ analytics }) => {
  const heading = (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '1.05rem',
        fontWeight: 800,
        color: TOKENS.textPrimary,
        margin: 0,
        letterSpacing: '-0.2px'
      }}>
        Organisation Activity
      </h2>
      <p style={{ fontSize: '0.8rem', color: TOKENS.textDim, marginTop: '4px' }}>
        Course pipeline, applicant flow and acceptance outcomes.
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
          Loading metrics...
        </div>
      </div>
    );
  }

  const { courses, applications, outcomes, recentApplications } = analytics;

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
          label="Published courses"
          value={courses?.published ?? 0}
          sub={`${courses?.total ?? 0} total courses`}
        />
        <MetricTile
          label="Applications"
          value={applications?.total ?? 0}
          sub={`${applications?.last7d ?? 0} new · last 7d`}
          trend={applications?.trend}
        />
        <MetricTile
          label="Accepted"
          value={applications?.accepted ?? 0}
          sub={`${applications?.pending ?? 0} pending review`}
        />
        <MetricTile
          label="Acceptance rate"
          value={`${outcomes?.conversionRate ?? 0}%`}
          sub={`${outcomes?.acceptedLast7d ?? 0} accepted · last 7d`}
          trend={outcomes?.trend}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '10px'
      }}>
        <SubPanel title="Application pipeline">
          <InfoRow label="Pending review" value={applications?.pending ?? 0} />
          <InfoRow label="Shortlisted" value={applications?.shortlisted ?? 0} />
          <InfoRow label="Accepted" value={applications?.accepted ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Rejected</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>
              {applications?.rejected ?? 0}
            </span>
          </div>
        </SubPanel>

        <SubPanel title="Course status mix">
          <InfoRow label="Published" value={courses?.published ?? 0} />
          <InfoRow label="Draft" value={courses?.drafts ?? 0} />
          <InfoRow label="Closed" value={courses?.closed ?? 0} />
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '0.8rem', color: TOKENS.textMuted, fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: '0.92rem', color: TOKENS.textPrimary, fontWeight: 800 }}>
              {courses?.total ?? 0}
            </span>
          </div>
        </SubPanel>

        <SubPanel title="Recent applications">
          {Array.isArray(recentApplications) && recentApplications.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {recentApplications.map((row) => (
                <div key={row.id} style={{
                  borderBottom: `1px solid ${TOKENS.border}`,
                  paddingBottom: '8px'
                }}>
                  <div style={{ color: TOKENS.textPrimary, fontSize: '0.86rem', fontWeight: 700 }}>
                    {row.applicant}
                  </div>
                  <div style={{ color: TOKENS.textDim, fontSize: '0.76rem' }}>
                    {row.courseTitle} · {row.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: TOKENS.textDim }}>
              No applications yet.
            </div>
          )}
        </SubPanel>
      </div>
    </div>
  );
};

export default Dashboard;