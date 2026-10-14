import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import api from '../../services/api';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCourses = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/admin/courses', { params });
      setCourses(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [filterStatus]);

  useEffect(() => {
    api.get('/admin/courses/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => console.error(err));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this course?')) return;
    setActionLoading(id);
    try {
      await api.put(`/admin/courses/${id}/cancel`);
      fetchCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Loader />;

  const q = searchTerm.trim().toLowerCase();
  const visibleCourses = q
    ? courses.filter((course) => {
      const title = course.title?.toLowerCase() || '';
      const org = course.organisation?.name?.toLowerCase() || '';
      const location = course.location?.toLowerCase() || '';
      const category = course.category?.toLowerCase() || '';
      const youthNames = Array.isArray(course.applicants)
        ? course.applicants.map((a) => (a.fullName || '').toLowerCase()).join(' ')
        : '';
      return `${title} ${org} ${location} ${category} ${youthNames}`.includes(q);
    })
    : [];

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
            All Courses
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Monitor and manage all courses on SkillBridge
          </p>
        </div>
      </div>

      <div className="fh-container">

        {/* Course counts */}
        <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            borderBottom: '1px solid var(--border-color)',
            padding: '10px 0',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--fb-blue)' }}>
              {stats?.totalCourses ?? 0}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'right' }}>
              Total Courses
            </div>
          </div>
          <div style={{
            borderBottom: '1px solid var(--border-color)',
            padding: '10px 0',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--fb-blue)' }}>
              {stats?.publishedCourses ?? 0}
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'right' }}>
              Published Courses
            </div>
          </div>
        </div>

        {/* Filter + Search */}
        <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search course, organisation, youth"
            style={{
              flex: '1 1 280px',
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
        </div>

        {!q ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p>Search for a course to display results.</p>
          </div>
        ) : visibleCourses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p>No courses found for that search.</p>
          </div>
        ) : (
          <div>
            {visibleCourses.map(course => (
              <div key={course._id} style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '2px'
                    }}>
                      <Link
                        to={`/admin/courses/${course._id}`}
                        style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}
                      >
                        {course.title}
                      </Link>
                    </h3>
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--fb-blue)',
                      fontWeight: '600'
                    }}>
                      <Link
                        to={`/profiles/organisation/${course.organisation?._id}`}
                        style={{ color: 'var(--fb-blue)', textDecoration: 'underline' }}
                      >
                        {course.organisation?.name || 'Organisation'}
                      </Link>
                    </p>
                  </div>

                  <span className={`fh-badge fh-badge-${course.status}`}>
                    {course.status}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap',
                  marginBottom: '16px'
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📍 {course.location}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    🎓 {course.category}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    👥 {course.filledSlots}/{course.totalSlots} slots
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📅 {new Date(course.applicationDeadline).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    to={`/admin/courses/${course._id}`}
                    style={{
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    View Course
                  </Link>

                  <Link
                    to={`/profiles/organisation/${course.organisation?._id}`}
                    style={{
                      border: '1px solid var(--fb-blue)',
                      color: 'var(--fb-blue)',
                      borderRadius: '999px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    View Org Profile
                  </Link>
                </div>

                {course.status === 'published' && (
                  <Button
                    variant="danger"
                    loading={actionLoading === course._id}
                    onClick={() => handleCancel(course._id)}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    Cancel Course
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;