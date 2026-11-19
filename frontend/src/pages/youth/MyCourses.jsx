import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getMyApplications } from '../../services/applicationService';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getMyApplications();
        const enrolledCourses = new Map();
        (response.data || []).forEach((application) => {
          if (application.status !== 'accepted' && application.completionStatus !== 'enrolled') return;
          const course = application.course;
          if (course?._id && !enrolledCourses.has(String(course._id))) {
            enrolledCourses.set(String(course._id), {
              ...course,
              organisation: application.organisation
            });
          }
        });
        setCourses([...enrolledCourses.values()]);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load your courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />
      <main className="fh-container">
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>
          My Courses
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Courses you have been accepted into.
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger-text)' }}>{error}</p>}
        {!error && courses.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>Accepted courses will appear here.</p>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          {courses.map((course) => (
            <Link
              key={course._id}
              to={`/courses/${course._id}`}
              style={{ textDecoration: 'none' }}
            >
              <article style={{
                padding: '16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px'
              }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>
                  {course.title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {course.organisation?.name || 'Course'}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyCourses;
