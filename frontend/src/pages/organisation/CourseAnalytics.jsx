import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getOrgCourses } from '../../services/courseService';
import { getOrgApplications } from '../../services/applicationService';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';

const CourseAnalytics = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, appsRes] = await Promise.all([
          getOrgCourses(),
          getOrgApplications()
        ]);
        setCourses(coursesRes.data);
        setApplications(appsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  const stats = [
    { label: 'Total Courses', value: courses.length, key: 'total_courses', color: 'var(--fb-blue)' },
    { label: 'Published', value: courses.filter(c => c.status === 'published').length, key: 'published', color: 'var(--fb-blue)' },
    { label: 'Total Applications', value: applications.length, key: 'total_apps', color: 'var(--fb-blue)' },
    { label: 'Shortlisted', value: applications.filter(a => a.status === 'shortlisted').length, key: 'shortlisted', color: 'var(--danger-primary)' },
    { label: 'Accepted', value: applications.filter(a => a.status === 'accepted').length, key: 'accepted', color: 'var(--success-primary)' },
    { label: 'Pending Review', value: applications.filter(a => a.status === 'submitted').length, key: 'pending', color: 'var(--fb-blue)' }
  ];

  const maxValue = Math.max(...stats.map(s => s.value), 1);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--fb-blue-subtle) 100%)',
        padding: '32px 20px 36px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/org/dashboard" style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}>
              ← Back to Dashboard
            </Link>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 5vw, 1.8rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            letterSpacing: '-0.3px'
          }}>
            Course Analytics
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
            Overview of all your courses and applications
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px 40px' }}>
        
        {/* Combined Line Graph Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 100%)',
          border: '2px solid var(--fb-blue)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '40px'
        }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--fb-blue)',
              marginBottom: '8px'
            }}>
              Statistics Overview
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Complete breakdown of all metrics
            </p>
          </div>

          {/* Line Chart */}
          <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
            <svg width="100%" height="400" viewBox="0 0 1000 400" style={{ minWidth: '600px' }}>
              {/* Grid Lines */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <line 
                  key={`grid-h-${i}`}
                  x1="80" 
                  y1={60 + (i * 50)} 
                  x2="950" 
                  y2={60 + (i * 50)}
                  stroke="var(--border-color)"
                  strokeDasharray="5,5"
                  strokeWidth="1"
                />
              ))}

              {/* Y-Axis */}
              <line x1="80" y1="50" x2="80" y2="350" stroke="var(--text-secondary)" strokeWidth="2" />
              
              {/* X-Axis */}
              <line x1="80" y1="350" x2="950" y2="350" stroke="var(--text-secondary)" strokeWidth="2" />

              {/* Y-Axis Labels */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <text 
                  key={`label-y-${i}`}
                  x="70" 
                  y={360 - (i * 50)}
                  fontSize="12"
                  fill="var(--text-secondary)"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {Math.round((maxValue / 5) * i)}
                </text>
              ))}

              {/* Line connecting all points */}
              <polyline
                points={stats.map((stat, i) => {
                  const x = 80 + (i * (870 / (stats.length - 1)));
                  const y = 350 - ((stat.value / maxValue) * 300);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="var(--fb-blue)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Area under line */}
              <polygon
                points={`80,350 ${stats.map((stat, i) => {
                  const x = 80 + (i * (870 / (stats.length - 1)));
                  const y = 350 - ((stat.value / maxValue) * 300);
                  return `${x},${y}`;
                }).join(' ')} 950,350`}
                fill="var(--fb-blue)"
                opacity="0.1"
              />

              {/* Data Points and Labels */}
              {stats.map((stat, i) => {
                const x = 80 + (i * (870 / (stats.length - 1)));
                const y = 350 - ((stat.value / maxValue) * 300);
                
                return (
                  <g key={i}>
                    {/* Point Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={stat.color}
                      stroke="var(--text-primary)"
                      strokeWidth="2"
                    />
                    
                    {/* Value Label */}
                    <text
                      x={x}
                      y={y - 20}
                      fontSize="13"
                      fontWeight="bold"
                      fill={stat.color}
                      textAnchor="middle"
                    >
                      {stat.value}
                    </text>

                    {/* X-Axis Label */}
                    <text
                      x={x}
                      y="375"
                      fontSize="11"
                      fill="var(--text-secondary)"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {stat.label.split(' ')[0]}
                    </text>

                    {/* Color Legend */}
                    <circle
                      cx={x}
                      cy={30}
                      r="5"
                      fill={stat.color}
                    />
                    <text
                      x={x + 12}
                      y="35"
                      fontSize="10"
                      fill="var(--text-secondary)"
                      textAnchor="start"
                    >
                      {stat.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stats List Below Chart */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)'
          }}>
            {stats.map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: `4px solid ${stat.color}`
              }}>
                <div style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: stat.color,
                  marginBottom: '4px'
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Applications as Profiles */}
        {applications.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '20px'
            }}>
              All Applications ({applications.length})
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {applications.map((item, i) => (
                <div key={i} style={{
                  background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--fb-blue)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(24, 119, 242, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  {/* Youth Profile Section */}
                  <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {item.youth?.photo ? (
                      <img
                        src={resolveImageUrl(item.youth.photo)}
                        alt={item.youth?.fullName}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--fb-blue)',
                        color: 'var(--text-on-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem'
                      }}>
                        {(item.youth?.fullName || 'Y').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link 
                        to={`/profiles/youth/${item.youth?._id}`}
                        style={{
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          fontSize: '1rem',
                          fontWeight: 700,
                          display: 'block',
                          marginBottom: '2px'
                        }}
                      >
                        {item.youth?.fullName}
                      </Link>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {item.youth?.email}
                      </p>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div style={{ padding: '16px' }}>
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>
                      <strong>Course:</strong> {item.course?.title}
                    </p>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)'
                      }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: stats.find(s => s.key === item.status)?.color ? `${stats.find(s => s.key === item.status).color}30` : 'var(--text-muted)30',
                        color: stats.find(s => s.key === item.status)?.color || 'var(--text-muted)'
                      }}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {applications.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(24, 119, 242, 0.2)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)'
          }}>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '1rem',
              fontWeight: 600,
              margin: 0
            }}>
              No applications received yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseAnalytics;
