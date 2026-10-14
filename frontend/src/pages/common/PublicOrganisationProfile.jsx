import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import api from '../../services/api';
import * as followService from '../../services/followService';
import { addCourseComment, toggleCourseReaction } from '../../services/courseService';
import { getMyApplications } from '../../services/applicationService';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';
import { COURSE_CATEGORIES } from '../../utils/constants';

const PublicOrganisationProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [appliedCourseIds, setAppliedCourseIds] = useState(new Set());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentOpen, setCommentOpen] = useState({});
  const [reactingCourseId, setReactingCourseId] = useState('');
  const [commentingCourseId, setCommentingCourseId] = useState('');
  const [postError, setPostError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/profiles/organisation/${id}`);
        setProfile(res.data.data);
        setPosts(res.data.data.posts || []);

        // Fetch follower count
        const countRes = await followService.getFollowCount(id, 'Organisation');
        setFollowerCount(countRes.data.data.count);

        // Check follow status if user is logged in
        if (user) {
          const statusRes = await followService.checkFollowStatus(id, 'Organisation');
          setIsFollowing(statusRes.data.data.isFollowing);
        }

        if (user?.role === 'youth') {
          try {
            const applicationsRes = await getMyApplications();
            setAppliedCourseIds(new Set(
              (applicationsRes.data || []).map((application) => application.course?._id).filter(Boolean)
            ));
          } catch (applicationsError) {
            setPostError(applicationsError.response?.data?.message || 'Unable to load your course applications');
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user]);

  const updatePostEngagement = (courseId, updater) => {
    setPosts((current) => current.map((post) => post._id === courseId
      ? { ...post, engagement: updater(post.engagement || {
          reactionsCount: 0,
          commentsCount: 0,
          reactedByMe: false,
          recentComments: []
        }) }
      : post
    ));
  };

  const handleToggleReaction = async (courseId) => {
    setReactingCourseId(courseId);
    setPostError('');
    try {
      const response = await toggleCourseReaction(courseId);
      updatePostEngagement(courseId, (current) => ({
        ...current,
        reactedByMe: response.data.reacted,
        reactionsCount: response.data.reactionsCount,
        commentsCount: response.data.commentsCount
      }));
    } catch (reactionError) {
      setPostError(reactionError.response?.data?.message || 'Unable to update reaction');
    } finally {
      setReactingCourseId('');
    }
  };

  const handleSubmitComment = async (courseId) => {
    const text = (commentDrafts[courseId] || '').trim();
    if (!text) return;

    setCommentingCourseId(courseId);
    setPostError('');
    try {
      const response = await addCourseComment(courseId, text);
      updatePostEngagement(courseId, (current) => ({
        ...current,
        commentsCount: response.data.commentsCount,
        recentComments: [response.data.comment, ...(current.recentComments || [])].slice(0, 3)
      }));
      setCommentDrafts((current) => ({ ...current, [courseId]: '' }));
      setCommentOpen((current) => ({ ...current, [courseId]: true }));
    } catch (commentError) {
      setPostError(commentError.response?.data?.message || 'Unable to add comment');
    } finally {
      setCommentingCourseId('');
    }
  };

  const handleFollowClick = async () => {
    if (!user) {
      setError('Please log in to follow organisations');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollowTarget(id, 'Organisation');
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await followService.followTarget(id, 'Organisation');
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-container" style={{ maxWidth: '760px' }}>
        {error ? (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        ) : (
          <div data-testid="organisation-profile">
            <section style={{
              padding: '8px 0 16px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {profile?.logo ? (
                  <img
                    src={resolveImageUrl(profile.logo)}
                    alt={profile.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'var(--fb-blue)',
                    color: 'var(--text-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1.2rem'
                  }}>
                    {(profile?.name || 'O').charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '2px' }}>
                    {profile?.name}
                  </h1>
                  <p style={{ color: 'var(--fb-blue)', fontSize: '0.86rem', fontWeight: 700, marginBottom: '8px' }}>
                    {profile?.type}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{followerCount}</strong> followers
                    </span>
                    {user && (
                      <button
                        onClick={handleFollowClick}
                        disabled={followLoading}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: isFollowing ? '1px solid var(--fb-blue)' : 'none',
                          background: isFollowing ? 'transparent' : 'var(--fb-blue)',
                          color: isFollowing ? 'var(--fb-blue)' : 'var(--text-on-primary)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: followLoading ? 'not-allowed' : 'pointer',
                          opacity: followLoading ? 0.6 : 1,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                    <ShareButton
                      url={`${window.location.origin}/profiles/organisation/${id}`}
                      title={profile?.name || 'Organisation'}
                      text={profile?.description?.slice(0, 140) || `${profile?.type || ''} on SkillBridge`}
                      compact
                    />
                  </div>
                </div>
              </div>
            </section>

            <div style={{ maxWidth: '680px' }}>
              <section style={{ padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '8px' }}>
                  About
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, margin: 0 }}>
                  {profile?.description || 'No description provided.'}
                </p>
              </section>

              <section style={{ padding: '14px 0' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '8px' }}>
                  Organisation details
                </h2>
                <div style={{ display: 'grid', gap: '0' }}>
                  {[
                    ['Location', profile?.location || 'N/A'],
                    ['Website', profile?.website || 'N/A'],
                    ['Email', profile?.email || 'N/A'],
                    ['Phone', profile?.phoneNumber || 'N/A']
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 0.35fr) 1fr', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.82rem' }}>
                        {label}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', overflowWrap: 'anywhere' }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section data-testid="organisation-posts" style={{ padding: '14px 0', borderTop: '1px solid var(--border-color)' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>
                  Posts
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 8px' }}>
                  Courses posted by this organisation.
                </p>
                {postError && (
                  <p role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.84rem', margin: '0 0 10px' }}>
                    {postError}
                  </p>
                )}
                {posts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                    No posts yet.
                  </p>
                ) : (
                  <div>
                    {posts.map((post, index) => {
                      const engagement = post.engagement || {
                        reactionsCount: 0,
                        commentsCount: 0,
                        reactedByMe: false,
                        recentComments: []
                      };
                      const isDeadlinePassed = new Date() > new Date(post.applicationDeadline);
                      const isFull = post.filledSlots >= post.totalSlots;
                      const alreadyApplied = appliedCourseIds.has(post._id);
                      const isActive = post.status === 'published' && !isDeadlinePassed;
                      const canApply = isActive && !alreadyApplied && !isFull && user?.role === 'youth';

                      return (
                        <article
                          key={post._id}
                          data-testid="organisation-post"
                          style={{
                            padding: '18px 0',
                            borderBottom: index < posts.length - 1 ? '1px solid var(--border-color)' : 'none',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <Link
                              to={`/profiles/organisation/${id}`}
                              aria-label={`View ${profile?.name || 'Organisation'} profile`}
                              style={{ display: 'flex', flexShrink: 0, textDecoration: 'none' }}
                            >
                              {profile?.logo ? (
                                <img
                                  src={resolveImageUrl(profile.logo)}
                                  alt=""
                                  style={{ width: '40px', height: '40px', borderRadius: '999px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '999px',
                                  background: 'var(--bg-section-alt)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--text-primary)',
                                  fontWeight: 800
                                }}>
                                  {(profile?.name || 'O').charAt(0).toUpperCase()}
                                </div>
                              )}
                            </Link>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Link
                                to={`/profiles/organisation/${id}`}
                                style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 800, textDecoration: 'none' }}
                              >
                                {profile?.name || 'Organisation'}
                              </Link>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '3px 0 0' }}>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.03rem', fontWeight: 800, marginBottom: '8px' }}>
                            {post.title}
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                            {post.description}
                          </p>

                          {post.coverImage && (
                            <Link
                              to={`/courses/${post._id}`}
                              style={{
                                display: 'block',
                                width: '100%',
                                margin: '0 0 12px',
                                aspectRatio: '16 / 9',
                                maxHeight: '520px',
                                overflow: 'hidden',
                                background: 'var(--bg-section-alt)',
                                textDecoration: 'none'
                              }}
                            >
                              <img
                                src={resolveImageUrl(post.coverImage)}
                                alt={`${post.title} course cover`}
                                loading="lazy"
                                decoding="async"
                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            </Link>
                          )}

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {COURSE_CATEGORIES.find((category) => category.value === post.category)?.label || post.category}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{post.location}</span>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              Deadline: {new Date(post.applicationDeadline).toLocaleDateString()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {(post.deliveryMode || '').replace('_', ' ')}
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
                              onClick={() => handleToggleReaction(post._id)}
                              disabled={!isActive || user?.role !== 'youth' || reactingCourseId === post._id}
                              style={{
                                border: '1px solid var(--border-color)',
                                background: engagement.reactedByMe ? 'rgba(24, 119, 242, 0.16)' : 'transparent',
                                color: engagement.reactedByMe ? 'var(--fb-blue)' : 'var(--text-secondary)',
                                borderRadius: '999px',
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: !isActive || user?.role !== 'youth' || reactingCourseId === post._id ? 'not-allowed' : 'pointer',
                                opacity: !isActive || user?.role !== 'youth' || reactingCourseId === post._id ? 0.7 : 1
                              }}
                            >
                              {engagement.reactedByMe ? 'Reacted' : 'React'} ({engagement.reactionsCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentOpen((current) => ({ ...current, [post._id]: !current[post._id] }))}
                              disabled={!isActive || user?.role !== 'youth'}
                              style={{
                                border: '1px solid var(--border-color)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                borderRadius: '999px',
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: !isActive || user?.role !== 'youth' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Comment ({engagement.commentsCount})
                            </button>
                            {canApply ? (
                              <Link
                                to={`/courses/${post._id}`}
                                style={{ background: 'var(--fb-blue)', color: 'var(--text-on-primary)', fontWeight: 800, fontSize: '0.82rem', borderRadius: '999px', padding: '6px 12px', textDecoration: 'none' }}
                              >
                                Apply
                              </Link>
                            ) : (
                              <span style={{
                                border: '1px solid var(--border-color)',
                                color: alreadyApplied ? 'var(--fb-blue)' : 'var(--text-muted)',
                                borderRadius: '999px',
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                fontWeight: 700
                              }}>
                                {alreadyApplied ? 'Applied' : isFull ? 'Full' : 'Closed'}
                              </span>
                            )}
                            <Link
                              to={`/courses/${post._id}`}
                              style={{ color: 'var(--fb-blue)', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}
                            >
                              View Course -&gt;
                            </Link>
                            <ShareButton
                              url={`${window.location.origin}/courses/${post._id}`}
                              title={post.title}
                              text={post.description?.slice(0, 200)}
                              entityType="course"
                              entityId={post._id}
                              compact
                            />
                          </div>

                          {commentOpen[post._id] && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <input
                                  type="text"
                                  value={commentDrafts[post._id] || ''}
                                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post._id]: event.target.value }))}
                                  placeholder="Write a comment"
                                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '0.85rem' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSubmitComment(post._id)}
                                  disabled={commentingCourseId === post._id}
                                  style={{ border: 'none', background: 'var(--fb-blue)', color: 'var(--text-on-primary)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 800, cursor: commentingCourseId === post._id ? 'not-allowed' : 'pointer', opacity: commentingCourseId === post._id ? 0.7 : 1 }}
                                >
                                  Post
                                </button>
                              </div>
                              {(engagement.recentComments || []).length > 0 && (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {engagement.recentComments.map((comment) => (
                                    <div key={comment._id} style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '10px' }}>
                                      <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
                                        {comment.user?.fullName || 'User'}
                                      </p>
                                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '2px 0 0' }}>
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
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOrganisationProfile;
