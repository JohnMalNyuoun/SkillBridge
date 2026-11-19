import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getMyApplications } from '../../services/applicationService';

const GroupChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await getMyApplications();
        const enrolledCourses = new Map();
        (response.data || []).forEach((application) => {
          if (application.status !== 'accepted' && application.completionStatus !== 'enrolled') return;
          const course = application.course;
          if (course?._id && course.groupChatId && !enrolledCourses.has(String(course._id))) {
            enrolledCourses.set(String(course._id), {
              ...course,
              organisation: application.organisation
            });
          }
        });
        setChats([...enrolledCourses.values()]);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load your group chats.');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />
      <main className="fh-container">
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>
          Group Chats
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Course discussions for your enrolled courses.
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger-text)' }}>{error}</p>}
        {!error && chats.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>
            Active group chats for your courses will appear here.
          </p>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          {chats.map((course) => (
            <Link
              key={course._id}
              to={`/group-chats/${course._id}`}
              style={{ textDecoration: 'none' }}
            >
              <article style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px'
              }}>
                <div>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>
                    {course.title}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    {course.organisation?.name || 'Course'}
                  </p>
                </div>
                <span style={{ color: 'var(--fb-blue)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Open chat →
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GroupChats;
