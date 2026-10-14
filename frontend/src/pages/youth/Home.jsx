import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import { addCourseComment, getAllCourses, toggleCourseReaction } from '../../services/courseService';
import { getMyApplications } from '../../services/applicationService';
import { COURSE_CATEGORIES, DELIVERY_MODES } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';

const Home = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentOpen, setCommentOpen] = useState({});
  const [reactingCourseId, setReactingCourseId] = useState('');
  const [commentingCourseId, setCommentingCourseId] = useState('');
  const [appliedCourseIds, setAppliedCourseIds] = useState(new Set());
  const [filters, setFilters] = useState({ search: '', category: '', deliveryMode: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, appsRes] = await Promise.all([
          getAllCourses(),
          getMyApplications()
        ]);

        setCourses(coursesRes.data || []);

        const appliedIds = new Set((appsRes.data || []).map((app) => app.course?._id).filter(Boolean));
        setAppliedCourseIds(appliedIds);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load course feed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  const searchTerm = filters.search.trim().toLowerCase();
  const visibleCourses = courses.filter((course) => {
    const matchesSearch = !searchTerm || [
      course.title,
      course.description,
      course.organisation?.name,
      course.location
    ].some((value) => value?.toLowerCase().includes(searchTerm));

    return matchesSearch
      && (!filters.category || course.category === filters.category)
      && (!filters.deliveryMode || course.deliveryMode === filters.deliveryMode);
  });

  const updateCourseEngagement = (courseId, updater) => {
    setCourses((prev) => prev.map((course) => {
      if (course._id !== courseId) return course;

      const current = course.engagement || {
        reactionsCount: 0,
        commentsCount: 0,
        reactedByMe: false,
        recentComments: []
      };

      return {
        ...course,
        engagement: updater(current)
      };
    }));
  };

  const handleToggleReaction = async (courseId) => {
    setReactingCourseId(courseId);
    setError('');

    try {
      const response = await toggleCourseReaction(courseId);
      const payload = response.data;

      updateCourseEngagement(courseId, (current) => ({
        ...current,
        reactedByMe: payload.reacted,
        reactionsCount: payload.reactionsCount,
        commentsCount: payload.commentsCount
      }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update reaction');
    } finally {
      setReactingCourseId('');
    }
  };

  const handleSubmitComment = async (courseId) => {
    const text = (commentDrafts[courseId] || '').trim();
    if (!text) return;

    setCommentingCourseId(courseId);
    setError('');

    try {
      const response = await addCourseComment(courseId, text);
      const payload = response.data;

      updateCourseEngagement(courseId, (current) => ({
        ...current,
        commentsCount: payload.commentsCount,
        recentComments: [payload.comment, ...(current.recentComments || [])].slice(0, 3)
      }));

      setCommentDrafts((prev) => ({ ...prev, [courseId]: '' }));
      setCommentOpen((prev) => ({ ...prev, [courseId]: true }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to add comment');
    } finally {
      setCommentingCourseId('');
    }
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div className="fh-container" style={{ maxWidth: '840px' }}>
        <header style={{ marginBottom: '18px', padding: '8px 0 4px' }}>
          <p style={{
            color: 'var(--fb-blue)',
            fontSize: '0.72rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            FursaHub Community
          </p>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: '1.6rem',
            fontWeight: 900,
            marginBottom: '4px'
          }}>
            Course Feed
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Discover, react to, and share opportunities posted by organisations.
          </p>
          <p style={{ color: 'var(--fb-blue-dark)', fontSize: '0.8rem', marginTop: '6px' }}>
            Active courses only: expired application deadlines are hidden.
          </p>
        </header>

        <section
          aria-label="Filter courses"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: 'var(--card-shadow)',
            padding: '14px',
            marginBottom: '18px'
          }}
        >
          <input
            type="search"
            aria-label="Search courses"
            placeholder="Search courses or organisations..."
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            style={{
              minWidth: 0,
              minHeight: '42px',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              background: 'var(--bg-section-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '0.86rem'
            }}
          />
          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            style={{
              minHeight: '42px',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              background: 'var(--bg-section-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '0.86rem'
            }}
          >
            <option value="">All categories</option>
            {COURSE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          <select
            aria-label="Filter by delivery mode"
            value={filters.deliveryMode}
            onChange={(event) => setFilters((current) => ({ ...current, deliveryMode: event.target.value }))}
            style={{
              minHeight: '42px',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              background: 'var(--bg-section-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '0.86rem'
            }}
          >
            <option value="">All delivery modes</option>
            {DELIVERY_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </section>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px' }}>
          {visibleCourses.length} {visibleCourses.length === 1 ? 'course' : 'courses'} found
        </p>

        {error && (
          <div
            style={{
              marginBottom: '14px',
              border: '1px solid var(--danger-border)',
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.85rem'
            }}
          >
            {error}
          </div>
        )}

        {visibleCourses.length === 0 ? (
          <div className="fh-empty">
            {courses.length === 0 ? 'No course posts yet.' : 'No courses match these filters. Try a different search.'}
          </div>
        ) : (
          <section>
            {visibleCourses.map((course, index) => {
              const postState = course.engagement || {
                reactionsCount: 0,
                commentsCount: 0,
                reactedByMe: false,
                recentComments: []
              };

              const isDeadlinePassed = new Date() > new Date(course.applicationDeadline);
              const isFull = course.filledSlots >= course.totalSlots;
              const alreadyApplied = appliedCourseIds.has(course._id);
              const canApply = !alreadyApplied && !isDeadlinePassed && !isFull;
              const courseCoverImage = resolveImageUrl(course.coverImage);

              return (
                <article
                  key={course._id}
                  style={{
                    padding: '18px',
                    marginBottom: '14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    boxShadow: 'var(--card-shadow)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    {course.organisation?.logo ? (
                      <img
                        src={resolveImageUrl(course.organisation.logo)}
                        alt={course.organisation?.name || 'Organisation'}
                        style={{ width: '40px', height: '40px', borderRadius: '999px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '999px',
                          background: 'var(--bg-section-alt)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-primary)',
                          fontWeight: 800
                        }}
                      >
                        {(course.organisation?.name || 'O').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link
                        to={`/profiles/organisation/${course.organisation?._id}`}
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '0.92rem',
                          fontWeight: 800,
                          textDecoration: 'none'
                        }}
                      >
                        {course.organisation?.name || 'Organisation'}
                      </Link>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(course.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1.03rem', fontWeight: 800, marginBottom: '8px' }}>
                    {course.title}
                  </h2>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '12px' }}>
                    {course.description}
                  </p>

                  {courseCoverImage && (
                    <Link
                      to={`/courses/${course._id}`}
                      style={{
                        display: 'block',
                        width: 'calc(100% + 36px)',
                        margin: '0 -18px 12px',
                        aspectRatio: '16 / 9',
                        maxHeight: '520px',
                        overflow: 'hidden',
                        background: 'var(--bg-section-alt)',
                        textDecoration: 'none'
                      }}
                    >
                      <img
                        src={courseCoverImage}
                        alt={`${course.title} course cover`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    </Link>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {COURSE_CATEGORIES.find((category) => category.value === course.category)?.label || course.category}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {course.location}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Deadline: {new Date(course.applicationDeadline).toLocaleDateString()}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {(course.deliveryMode || '').replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleToggleReaction(course._id)}
                      disabled={reactingCourseId === course._id}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: postState.reactedByMe ? 'rgba(24, 119, 242, 0.16)' : 'transparent',
                        color: postState.reactedByMe ? 'var(--fb-blue)' : 'var(--text-secondary)',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: reactingCourseId === course._id ? 'not-allowed' : 'pointer',
                        opacity: reactingCourseId === course._id ? 0.7 : 1
                      }}
                    >
                      {postState.reactedByMe ? 'Reacted' : 'React'} ({postState.reactionsCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommentOpen((prev) => ({
                        ...prev,
                        [course._id]: !prev[course._id]
                      }))}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        borderRadius: '999px',
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Comment ({postState.commentsCount})
                    </button>

                    {canApply ? (
                      <Link
                        to={`/courses/${course._id}`}
                        style={{
                          background: 'var(--fb-blue)',
                          color: 'var(--text-on-primary)',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          borderRadius: '999px',
                          padding: '6px 12px',
                          textDecoration: 'none'
                        }}
                      >
                        Apply
                      </Link>
                    ) : (
                      <span
                        style={{
                          border: '1px solid var(--border-color)',
                          color: alreadyApplied ? 'var(--fb-blue)' : 'var(--text-muted)',
                          borderRadius: '999px',
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 700
                        }}
                      >
                        {alreadyApplied ? 'Applied' : isFull ? 'Full' : 'Closed'}
                      </span>
                    )}

                    <Link
                      to={`/courses/${course._id}`}
                      style={{
                        color: 'var(--fb-blue)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        textDecoration: 'none'
                      }}
                    >
                      View Course -&gt;
                    </Link>
                    <ShareButton
                      url={`${window.location.origin}/courses/${course._id}`}
                      title={course.title}
                      text={course.description?.slice(0, 200)}
                      entityType="course"
                      entityId={course._id}
                      compact
                    />
                  </div>

                  {commentOpen[course._id] && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={commentDrafts[course._id] || ''}
                          onChange={(e) => setCommentDrafts((prev) => ({
                            ...prev,
                            [course._id]: e.target.value
                          }))}
                          placeholder="Write a comment"
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            padding: '8px 10px',
                            fontSize: '0.85rem'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitComment(course._id)}
                          disabled={commentingCourseId === course._id}
                          style={{
                            border: 'none',
                            background: 'var(--fb-blue)',
                            color: 'var(--text-on-primary)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: commentingCourseId === course._id ? 'not-allowed' : 'pointer',
                            opacity: commentingCourseId === course._id ? 0.7 : 1
                          }}
                        >
                          Post
                        </button>
                      </div>

                      {(postState.recentComments || []).length > 0 && (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {postState.recentComments.map((comment) => (
                            <div
                              key={comment._id}
                              style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '10px' }}
                            >
                              <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700 }}>
                                {comment.user?.fullName || 'User'}
                              </p>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
                                {comment.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;