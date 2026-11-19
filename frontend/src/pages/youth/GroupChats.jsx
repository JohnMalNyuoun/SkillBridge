import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import { getMyApplications } from '../../services/applicationService';
import { getActiveCourseCall } from '../../services/courseCallService';

const GroupChats = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [callStatusError, setCallStatusError] = useState('');

  useEffect(() => {
    let active = true;
    let callStatusInterval;

    const refreshCallStatuses = async (courses) => {
      const results = await Promise.all(courses.map(async (course) => {
        try {
          const response = await getActiveCourseCall(course._id);
          return {
            courseId: String(course._id),
            callSession: response.data.callSession || null
          };
        } catch (err) {
          return {
            courseId: String(course._id),
            callSession: null,
            error: err.response?.data?.message || 'Unable to check for an ongoing call.'
          };
        }
      }));

      if (!active) return;
      const statusByCourse = new Map(results.map((result) => [result.courseId, result]));
      setChats((current) => current.map((course) => {
        const status = statusByCourse.get(String(course._id));
        if (!status || status.error) return course;
        return { ...course, activeCall: status.callSession };
      }));
      const failedStatus = results.find((result) => result.error);
      setCallStatusError(failedStatus?.error || '');
    };

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
        const courses = [...enrolledCourses.values()];
        if (!active) return;
        setChats(courses);
        await refreshCallStatuses(courses);
        if (active) {
          callStatusInterval = window.setInterval(
            () => void refreshCallStatuses(courses),
            15000
          );
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load your group chats.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchChats();
    return () => {
      active = false;
      if (callStatusInterval) window.clearInterval(callStatusInterval);
    };
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
        {callStatusError && (
          <p role="alert" style={{ color: 'var(--danger-text)', marginBottom: '12px' }}>
            {callStatusError}
          </p>
        )}
        {!error && chats.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>
            Active group chats for your courses will appear here.
          </p>
        )}
        <div style={{ display: 'grid', gap: '12px' }}>
          {chats.map((course) => (
            <article style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }} key={course._id}>
              <Link
                to={`/group-chats/${course._id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flex: '1 1 220px',
                  textDecoration: 'none'
                }}
              >
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
              </Link>
              {course.activeCall && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    color: 'var(--success-text)',
                    fontSize: '0.82rem',
                    fontWeight: 800
                  }}>
                    Ongoing call
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/calls/${course.activeCall._id}`)}
                    aria-label={`Join the ongoing call for ${course.title}`}
                    style={{
                      border: 0,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      background: 'var(--success-primary)',
                      color: 'var(--text-on-primary)',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Join
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GroupChats;
