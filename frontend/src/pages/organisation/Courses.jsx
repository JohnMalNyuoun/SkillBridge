import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import ShareButton from '../../components/common/ShareButton';
import {
  getOrgCourses,
  getOrgDiscoverCourses,
  publishCourse,
  closeCourse,
  deleteCourse
} from '../../services/courseService';
import { followTarget, unfollowTarget } from '../../services/followService';
import { COURSE_CATEGORIES } from '../../utils/constants';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('mine');
  const [discoverCourses, setDiscoverCourses] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoaded, setDiscoverLoaded] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [followingOnly, setFollowingOnly] = useState(false);
  const [followActionId, setFollowActionId] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await getOrgCourses();
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openDiscoverFeed = async () => {
    setActiveTab('discover');
    setDiscoverError('');
    if (discoverLoaded) return;

    setDiscoverLoading(true);
    try {
      const response = await getOrgDiscoverCourses();
      setDiscoverCourses(response.data || []);
      setDiscoverLoaded(true);
    } catch (err) {
      setDiscoverError(err?.response?.data?.message || 'Failed to load public courses');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleFollowOrganisation = async (course) => {
    const organisationId = course.organisation?._id;
    if (!organisationId) return;

    setFollowActionId(organisationId);
    setDiscoverError('');
    try {
      if (course.isFollowed) {
        await unfollowTarget(organisationId, 'Organisation');
      } else {
        await followTarget(organisationId, 'Organisation');
      }
      setDiscoverCourses((current) => current.map((item) => (
        item.organisation?._id === organisationId
          ? { ...item, isFollowed: !course.isFollowed }
          : item
      )));
    } catch (err) {
      setDiscoverError(err?.response?.data?.message || 'Unable to update organisation follow status');
    } finally {
      setFollowActionId('');
    }
  };

  const handlePublish = async (id) => {
    setActionLoading(id + '_publish');
    try {
      await publishCourse(id);
      fetchCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this course? Youth will no longer be able to apply.')) return;
    setActionLoading(id + '_close');
    try {
      await closeCourse(id);
      fetchCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course? This cannot be undone.')) return;
    setActionLoading(id + '_delete');
    try {
      await deleteCourse(id);
      fetchCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const groupedCourses = {
    published: courses.filter((course) => course.status === 'published'),
    draft: courses.filter((course) => course.status === 'draft'),
    closed: courses.filter((course) => course.status === 'closed' || course.status === 'cancelled')
  };

  const sectionConfig = [
    {
      key: 'published',
      title: 'Published Courses',
      description: 'Visible to youth and currently accepting applications.',
      items: groupedCourses.published
    },
    {
      key: 'draft',
      title: 'Draft Courses',
      description: 'Not yet visible to youth. Publish when ready.',
      items: groupedCourses.draft
    },
    {
      key: 'closed',
      title: 'Closed Courses',
      description: 'Ended or manually closed courses.',
      items: groupedCourses.closed
    }
  ];
  const visibleDiscoverCourses = discoverCourses.filter((course) => (
    !followingOnly || course.isFollowed
  ));

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {/* Header */}
      <div className="fh-section-head">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '4px'
            }}>
              Your Courses
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Number of courses posted: {courses.length}
            </p>
          </div>
        </div>
      </div>

      <div className="fh-container">
        <section
          aria-label="Create a course post"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            padding: '16px',
            marginBottom: '24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '44px',
              height: '44px',
              flex: '0 0 44px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--fb-blue-subtle)',
              color: 'var(--fb-blue)',
              fontSize: '1.5rem',
              fontWeight: 700
            }}
          >
            +
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '2px' }}>
              Share a course opportunity
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              Create a course post for young people to discover and apply to.
            </p>
          </div>
          <Link to="/org/courses/new" className="fh-mobile-full" style={{ display: 'inline-block' }}>
            <Button className="fh-mobile-full">+ Post a Course</Button>
          </Link>
        </section>

        <nav
          aria-label="Course views"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '20px'
          }}
        >
          <button
            type="button"
            aria-current={activeTab === 'mine' ? 'page' : undefined}
            onClick={() => setActiveTab('mine')}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              color: activeTab === 'mine' ? 'var(--fb-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'mine' ? '3px solid var(--fb-blue)' : '3px solid transparent',
              fontWeight: 800,
              fontSize: '0.88rem'
            }}
          >
            My courses
          </button>
          <button
            type="button"
            aria-current={activeTab === 'discover' ? 'page' : undefined}
            onClick={openDiscoverFeed}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              color: activeTab === 'discover' ? 'var(--fb-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'discover' ? '3px solid var(--fb-blue)' : '3px solid transparent',
              fontWeight: 800,
              fontSize: '0.88rem'
            }}
          >
            Discover organisations
          </button>
        </nav>

        {activeTab === 'discover' ? (
          <section aria-label="Public courses from other organisations">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '14px'
            }}>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800 }}>
                  Public course posts
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  Follow other organisations or browse all their active published courses.
                </p>
              </div>
              <button
                type="button"
                aria-pressed={followingOnly}
                onClick={() => setFollowingOnly((current) => !current)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '999px',
                  color: followingOnly ? 'var(--fb-blue)' : 'var(--text-secondary)',
                  background: followingOnly ? 'var(--fb-blue-subtle)' : 'var(--bg-card)',
                  fontWeight: 800,
                  fontSize: '0.8rem'
                }}
              >
                {followingOnly ? 'Following only' : 'All organisations'}
              </button>
            </div>

            {discoverError && (
              <div role="alert" style={{
                marginBottom: '14px',
                border: '1px solid var(--danger-border)',
                background: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.85rem'
              }}>
                {discoverError}
              </div>
            )}

            {discoverLoading ? <Loader /> : visibleDiscoverCourses.length === 0 ? (
              <div className="fh-empty">
                {followingOnly
                  ? 'You are not following any organisations with active public courses yet.'
                  : 'No other organisations have active public courses right now.'}
              </div>
            ) : (
              visibleDiscoverCourses.map((course, index) => {
                const rawCourseCover = typeof course.coverImage === 'string' ? course.coverImage.trim() : '';
                const courseCover = rawCourseCover.startsWith('//')
                  ? `https:${rawCourseCover}`
                  : rawCourseCover.replace(/^http:\/\//, 'https://');
                const organisationId = course.organisation?._id;

                return (
                  <article key={course._id} style={{
                    marginBottom: '14px',
                    padding: '18px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    boxShadow: 'var(--card-shadow)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      {course.organisation?.logo ? (
                        <img
                          src={course.organisation.logo.replace(/^http:\/\//, 'https://')}
                          alt={course.organisation.name || 'Organisation'}
                          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div aria-hidden="true" style={{
                          width: '42px',
                          height: '42px',
                          flex: '0 0 42px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: 'var(--fb-blue-subtle)',
                          color: 'var(--fb-blue)',
                          fontWeight: 900
                        }}>
                          {(course.organisation?.name || 'O').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/profiles/organisation/${organisationId}`} style={{
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontWeight: 800
                        }}>
                          {course.organisation?.name || 'Organisation'}
                        </Link>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                          Posted {new Date(course.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFollowOrganisation(course)}
                        disabled={!organisationId || followActionId === organisationId}
                        style={{
                          padding: '7px 12px',
                          border: course.isFollowed ? '1px solid var(--fb-blue)' : 'none',
                          borderRadius: '999px',
                          color: course.isFollowed ? 'var(--fb-blue)' : 'var(--text-on-primary)',
                          background: course.isFollowed ? 'transparent' : 'var(--fb-blue)',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          opacity: followActionId === organisationId ? 0.65 : 1
                        }}
                      >
                        {followActionId === organisationId ? 'Updating...' : course.isFollowed ? 'Following' : 'Follow'}
                      </button>
                    </div>

                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px' }}>
                      {course.title}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      marginBottom: '12px'
                    }}>
                      {course.description}
                    </p>
                    {courseCover && (
                      <div
                        style={{
                          width: 'calc(100% + 36px)',
                          margin: '0 -18px 12px',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={courseCover}
                          alt={`${course.title} course cover`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '520px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      </div>
                    )}
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                      {COURSE_CATEGORIES.find((category) => category.value === course.category)?.label || course.category}
                      {' · '}{course.location}
                      {' · '}Apply by {new Date(course.applicationDeadline).toLocaleDateString()}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <Link to={`/profiles/organisation/${organisationId}`} style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}>
                        Organisation profile
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
                  </article>
                );
              })
            )}
          </section>
        ) : (
        <>
        {courses.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 24px',
            color: 'var(--text-muted)'
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
              No courses posted yet
            </p>
            <Link to="/org/courses/new">
              <Button>Post Your First Course</Button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sectionConfig.map((section) => {
              if (section.items.length === 0) return null;

              return (
                <section key={section.key}>
                  <div style={{ marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {section.title}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {section.description}
                    </p>
                  </div>

                  <div>
                    {section.items.map((course, idx) => {
                      const rawCardImage = typeof course.coverImage === 'string' ? course.coverImage.trim() : '';
                      const cardImage = rawCardImage.startsWith('//')
                        ? `https:${rawCardImage}`
                        : rawCardImage.replace(/^http:\/\//, 'https://');
                      const isPublic = course.status === 'published'
                        && new Date(course.applicationDeadline) >= new Date();
                      return (
                        <div key={course._id} style={{
                          padding: '18px 0',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          {cardImage && (
                            <div style={{
                              width: '100%',
                              marginBottom: '16px'
                            }}>
                              <img
                                src={cardImage}
                                alt={`${course.title} course cover`}
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  maxHeight: '520px',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            </div>
                          )}

                          <div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '10px',
                              marginBottom: '10px'
                            }}>
                              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                {course.title || `Course ${idx + 1}`}
                              </h3>
                              <span className={`fh-badge fh-badge-${course.status}`}>
                                {course.status}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Link
                                to={`/org/courses/${course._id}`}
                                style={{
                                  border: '1px solid var(--border-color)',
                                  background: 'transparent',
                                  color: 'var(--text-secondary)',
                                  borderRadius: '999px',
                                  padding: '8px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                View
                              </Link>

                              {course.status !== 'published' && (
                                <Link
                                  to={`/org/courses/${course._id}/edit`}
                                  style={{
                                    border: '1px solid var(--fb-blue)',
                                    background: 'transparent',
                                    color: 'var(--fb-blue)',
                                    borderRadius: '999px',
                                    padding: '8px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    textDecoration: 'none'
                                  }}
                                >
                                  Edit
                                </Link>
                              )}

                              {course.status === 'draft' && (
                                <>
                                  <Button
                                    loading={actionLoading === course._id + '_publish'}
                                    onClick={() => handlePublish(course._id)}
                                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                  >
                                    Publish
                                  </Button>
                                  <Button
                                    variant="danger"
                                    loading={actionLoading === course._id + '_delete'}
                                    onClick={() => handleDelete(course._id)}
                                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                              {course.status === 'published' && (
                                <>
                                  {isPublic && (
                                    <ShareButton
                                      url={`${window.location.origin}/courses/${course._id}`}
                                      title={course.title}
                                      text={course.description?.slice(0, 200)}
                                      entityType="course"
                                      entityId={course._id}
                                      compact
                                    />
                                  )}
                                  <Button
                                    variant="outline"
                                    loading={actionLoading === course._id + '_close'}
                                    onClick={() => handleClose(course._id)}
                                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                  >
                                    Close Course
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default Courses;