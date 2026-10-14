import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import api from '../../services/api';
import * as followService from '../../services/followService';
import useAuth from '../../hooks/useAuth';
import { resolveImageUrl } from '../../utils/imageUrl';

const PublicOrganisationProfile = () => {
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
        const res = await api.get(`/profiles/organisation/${id}`);
        setProfile(res.data.data);

        // Fetch follower count
        const countRes = await followService.getFollowCount(id, 'Organisation');
        setFollowerCount(countRes.data.data.count);

        // Check follow status if user is logged in
        if (user) {
          const statusRes = await followService.checkFollowStatus(id, 'Organisation');
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

      <div className="fh-section-head">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Organisation Profile
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Public organisation details
          </p>
        </div>
      </div>

      <div className="fh-container">
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
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: 'var(--card-shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              {profile?.logo ? (
                <img
                  src={resolveImageUrl(profile.logo)}
                  alt={profile.name}
                  style={{ width: '76px', height: '76px', borderRadius: '14px', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '14px',
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

              <div style={{ flex: 1 }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, marginBottom: '2px' }}>
                  {profile?.name}
                </h2>
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
                    url={`${window.location.origin}/profiles/organisation/${id}`}
                    title={profile?.name || 'Organisation'}
                    text={profile?.description?.slice(0, 140) || `${profile?.type || ''} on FursaHub`}
                    compact
                  />
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '16px', lineHeight: 1.7 }}>
              {profile?.description || 'No description provided.'}
            </p>

            <div style={{ display: 'grid', gap: '8px' }}>
              {[
                ['Location', profile?.location || 'N/A'],
                ['Website', profile?.website || 'N/A'],
                ['Email', profile?.email || 'N/A'],
                ['Phone', profile?.phoneNumber || 'N/A']
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.84rem' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOrganisationProfile;
