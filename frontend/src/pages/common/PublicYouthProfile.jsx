import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import api from '../../services/api';
import * as followService from '../../services/followService';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';

const PublicYouthProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/profiles/youth/${id}`);
        setProfile(res.data.data);

        const countRes = await followService.getFollowCount(id, 'User');
        setFollowerCount(countRes.data.data.count);

        if (user && user.id !== id) {
          const statusRes = await followService.checkFollowStatus(id, 'User');
          setIsFollowing(statusRes.data.data.isFollowing);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user]);

  const initials = useMemo(() => {
    const name = profile?.fullName || '';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'YU'
    );
  }, [profile]);

  const handleFollowClick = async () => {
    if (!user) {
      setError('Please log in to follow users');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollowTarget(id, 'User');
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
      } else {
        await followService.followTarget(id, 'User');
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
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

      <div className="fh-section-head">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Youth Profile
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Public profile information
          </p>
        </div>
      </div>

      <div className="fh-container">
        {error ? (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-primary)',
              borderRadius: '12px',
              padding: '12px',
              color: 'var(--danger-text)'
            }}
          >
            {error}
          </div>
        ) : (
          <div
            style={{
              padding: '0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {profile?.photo ? (
                  <img
                    src={resolveImageUrl(profile.photo)}
                    alt={profile.fullName}
                    style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem'
                    }}
                  >
                    {initials}
                  </div>
                )}

                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '2px' }}>
                    {profile?.fullName}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '2px' }}>
                    @{profile?.username || 'username_not_set'}
                  </p>
                </div>
              </div>

              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'block', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{followerCount}</strong> followers
                </span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {user && user.id !== id && (
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: isFollowing ? '1px solid var(--fb-blue)' : 'none',
                        background: isFollowing ? 'transparent' : 'var(--fb-blue)',
                        color: isFollowing ? 'var(--fb-blue)' : 'var(--text-primary)',
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
                    url={`${window.location.origin}/profiles/youth/${id}`}
                    title={profile?.fullName || 'Youth Profile'}
                    text={profile?.bio?.slice(0, 140) || 'On FursaHub'}
                    compact
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px' }}>
                {profile?.bio || 'No bio provided.'}
              </p>

              <div style={{ display: 'grid', gap: '8px' }}>
                {[
                  ['Community', profile?.communityType?.replace('_', ' ') || 'N/A'],
                  ['Date of Birth', profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'],
                  ['Email', profile?.email || 'N/A'],
                  ['Phone', profile?.phoneNumber || 'N/A'],
                  ['Gender', profile?.gender || 'N/A'],
                  ['Language', profile?.language || 'N/A']
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.84rem' }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', textTransform: 'capitalize' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '10px' }}>
                  Courses
                </h3>

                {profile?.attendedCourses && profile.attendedCourses.length > 0 ? (
                  <div style={{ display: 'grid', gap: '0' }}>
                    {profile.attendedCourses.map((course, index) => (
                      <div
                        key={course._id || index}
                        style={{
                          padding: '12px 0',
                          borderBottom: index < profile.attendedCourses.length - 1 ? '1px solid var(--border-color)' : 'none'
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                          {course.title || 'Course Name'}
                        </p>
                        <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {course.description || 'No details'}
                        </p>
                        {course.status && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Status: <strong style={{ color: 'var(--fb-blue)' }}>{String(course.status).replace('_', ' ')}</strong>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No courses yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicYouthProfile;
