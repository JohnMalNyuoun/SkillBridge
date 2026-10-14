import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import { getOrgCourse } from '../../services/courseService';
import { resolveImageUrl } from '../../utils/imageUrl';

const OrgCourseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await getOrgCourse(id);
        setCourse(res?.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-section-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/org/courses')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fb-blue)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '8px'
            }}
          >
            ← Back to Courses
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Course Details
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            View all details of your posted course.
          </p>
        </div>
      </div>

      <div className="fh-container">
        {error ? (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: 'var(--radius)',
            padding: '12px',
            color: 'var(--danger-text)',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        ) : !course ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Course not found.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {course.coverImage && (
              <img
                src={resolveImageUrl(course.coverImage)}
                alt={course.title}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                style={{
                  width: '100%',
                  maxHeight: '320px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                {course.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShareButton
                  url={`${window.location.origin}/courses/${course._id}`}
                  title={course.title}
                  text={course.description?.slice(0, 140)}
                  compact
                />
                <span className={`fh-badge fh-badge-${course.status}`}>{course.status}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {course.description}
            </p>

            <div style={{ display: 'grid', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              {[
                ['Category', course.category || 'N/A'],
                ['Target Audience', course.targetAudience || 'N/A'],
                ['Gender', course.gender || 'N/A'],
                ['Delivery Mode', course.deliveryMode ? course.deliveryMode.replace('_', ' ') : 'N/A'],
                ['Location', course.location || 'N/A'],
                ['Total Slots', course.totalSlots || 'N/A'],
                ['Filled Slots', course.filledSlots || 0],
                ['Start Date', course.startDate ? new Date(course.startDate).toLocaleDateString() : 'N/A'],
                ['End Date', course.endDate ? new Date(course.endDate).toLocaleDateString() : 'N/A'],
                ['Deadline', course.applicationDeadline ? new Date(course.applicationDeadline).toLocaleDateString() : 'N/A']
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>

            {Array.isArray(course.applicationQuestions) && course.applicationQuestions.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '8px' }}>
                  Application Questions
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {course.applicationQuestions.map((q, index) => (
                    <div key={`${q?.question || 'q'}-${index}`} style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {index + 1}. {q?.question || 'Untitled question'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <Link
                to="/org/courses"
                style={{
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Back
              </Link>
              {course.status !== 'published' && (
                <Link
                  to={`/org/courses/${course._id}/edit`}
                  style={{
                    background: 'var(--fb-blue)',
                    color: 'var(--text-on-primary)',
                    borderRadius: '999px',
                    padding: '8px 14px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  Edit Course
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgCourseDetail;
