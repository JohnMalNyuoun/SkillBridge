import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getOrgCourses } from '../../services/courseService';
import { getOrgApplications } from '../../services/applicationService';
import { createOrgMember, getOrgDashboard } from '../../services/orgDashboardService';
import useAuth from '../../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const canManageTeam = ['organisation', 'org_admin'].includes(user?.role);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeGroupChats, setActiveGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [creatingMember, setCreatingMember] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberNotice, setMemberNotice] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, appsRes] = await Promise.all([
          getOrgCourses(),
          getOrgApplications()
        ]);
        setCourses(coursesRes.data || []);
        setApplications(appsRes.data || []);
        if (canManageTeam) {
          const dashboardRes = await getOrgDashboard();
          setTeamMembers(dashboardRes.data?.teamMembers || []);
          setActiveGroupChats(dashboardRes.data?.activeGroupChats || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canManageTeam]);

  const handleCreateMember = async (event) => {
    event.preventDefault();
    setCreatingMember(true);
    setMemberError('');
    setMemberNotice('');

    try {
      const response = await createOrgMember(memberForm);
      setTeamMembers((current) => [{
        ...response.data,
        _id: response.data.id
      }, ...current]);
      setMemberForm({ fullName: '', email: '', password: '', role: 'staff' });
      setMemberNotice('Team member created.');
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Unable to create the team member.');
    } finally {
      setCreatingMember(false);
    }
  };

  if (loading) return <Loader />;

  const totalCourses = courses.length;
  const totalApplications = applications.length;
  const pendingApplications = applications.filter((a) => a.status === 'submitted').length;

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
  const memberFieldStyle = {
    width: '100%',
    minWidth: 0,
    padding: '10px 12px',
    background: 'var(--bg-section-alt)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px'
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

        {canManageTeam && (
          <>
            <section style={{ marginBottom: '28px' }}>
              <h2 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '14px'
              }}>
                Active Group Chats
              </h2>
              {activeGroupChats.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No active group chats yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {activeGroupChats.map((chat) => (
                    <Link
                      key={chat._id}
                      to={`/org/group-chats/${chat.courseId}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <article style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 0',
                        borderBottom: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <h3 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 800 }}>
                            {chat.name}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                            {chat.participantCount} participants
                          </p>
                        </div>
                        <span style={{ color: 'var(--fb-blue)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          Open →
                        </span>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section style={{ marginBottom: '28px' }}>
              <h2 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '14px'
              }}>
                Organization Team
              </h2>
              <form
                onSubmit={handleCreateMember}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  marginBottom: '16px'
                }}
              >
                <input
                  required
                  aria-label="Team member name"
                  placeholder="Full name"
                  value={memberForm.fullName}
                  style={memberFieldStyle}
                  onChange={(event) => setMemberForm((current) => ({
                    ...current,
                    fullName: event.target.value
                  }))}
                />
                <input
                  required
                  type="email"
                  aria-label="Team member email"
                  placeholder="Email"
                  value={memberForm.email}
                  style={memberFieldStyle}
                  onChange={(event) => setMemberForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))}
                />
                <input
                  required
                  type="password"
                  minLength={6}
                  aria-label="Temporary password"
                  placeholder="Temporary password"
                  value={memberForm.password}
                  style={memberFieldStyle}
                  onChange={(event) => setMemberForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))}
                />
                <select
                  aria-label="Team member role"
                  value={memberForm.role}
                  style={memberFieldStyle}
                  onChange={(event) => setMemberForm((current) => ({
                    ...current,
                    role: event.target.value
                  }))}
                >
                  <option value="staff">Staff</option>
                  <option value="trainee">Trainee</option>
                </select>
                <button
                  type="submit"
                  disabled={creatingMember}
                  style={{
                    border: 0,
                    borderRadius: '9px',
                    padding: '10px 14px',
                    color: 'var(--text-on-primary)',
                    background: 'var(--fb-blue)',
                    fontWeight: 800,
                    cursor: creatingMember ? 'wait' : 'pointer'
                  }}
                >
                  {creatingMember ? 'Adding…' : 'Add team member'}
                </button>
              </form>
              {memberError && <p role="alert" style={{ color: 'var(--danger-text)', marginBottom: '10px' }}>{memberError}</p>}
              {memberNotice && <p role="status" style={{ color: 'var(--success-text)', marginBottom: '10px' }}>{memberNotice}</p>}
              {teamMembers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No staff or trainees have been added yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {teamMembers.map((member) => (
                    <div
                      key={member._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 0',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {member.fullName}
                        </strong>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '3px' }}>
                          {member.email}
                        </p>
                      </div>
                      <span style={{
                        color: member.isSuspended ? 'var(--danger-text)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.role}{member.isSuspended ? ' · Suspended' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

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

export default Dashboard;