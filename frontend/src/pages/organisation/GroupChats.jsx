import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import CourseGroupDiscussion from '../../components/common/CourseGroupDiscussion';
import useAuth from '../../hooks/useAuth';
import { getOrgCourses } from '../../services/courseService';

const OrgGroupChatList = () => {
  const { user } = useAuth();
  const canCreateChat = ['organisation', 'org_admin'].includes(user?.role);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await getOrgCourses();
        setCourses(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load organization courses.');
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
          Group Chats
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Open or create a group chat for any of your courses.
        </p>
        {error && <p role="alert" style={{ color: 'var(--danger-text)' }}>{error}</p>}
        {!error && courses.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>Your courses will appear here.</p>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          {courses.map((course) => (
            <Link
              key={course._id}
              to={`/org/group-chats/${course._id}`}
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
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>
                    {course.groupChatId ? 'Active group chat' : 'Group chat not created'}
                  </p>
                </div>
                <span style={{ color: 'var(--fb-blue)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {course.groupChatId
                    ? 'Open chat →'
                    : canCreateChat ? 'Create chat →' : 'Not created yet'}
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

const OrgGroupChatRoom = ({ courseId }) => {
  const { user } = useAuth();
  const canCreateChat = ['organisation', 'org_admin'].includes(user?.role);

  return (
    <div className="fh-page">
      <Navbar />
      <div className="fh-section-head">
        <div>
          <Link
            to="/org/group-chats"
            style={{ color: 'var(--fb-blue)', fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none' }}
          >
            ← Back to group chats
          </Link>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, marginTop: '8px' }}>
            Group Chat
          </h1>
        </div>
      </div>
      <main className="fh-container">
        <CourseGroupDiscussion
          courseId={courseId}
          isOrgAdmin={canCreateChat}
          canStartCall={['organisation', 'org_admin', 'staff', 'trainee'].includes(user?.role)}
        />
      </main>
    </div>
  );
};

const OrgGroupChats = () => {
  const { id } = useParams();
  return id ? <OrgGroupChatRoom courseId={id} /> : <OrgGroupChatList />;
};

export default OrgGroupChats;
