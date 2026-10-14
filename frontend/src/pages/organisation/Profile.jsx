import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import { getOrgProfile, updateOrgLogo, updateOrgProfile } from '../../services/profileService';
import * as followService from '../../services/followService';
import { useLanguage } from '../../hooks/useLanguage';
import { resolveImageUrl } from '../../utils/imageUrl';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../../utils/formDraftStorage';

const OrgProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [failedLogoSrc, setFailedLogoSrc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersTotal, setFollowersTotal] = useState(0);
  const [followingTotal, setFollowingTotal] = useState(0);
  const logoInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    bio: '',
    phoneNumber: '',
    location: '',
    website: ''
  });
  const { t } = useLanguage();

  const logoSrc = useMemo(() => {
    if (!profile?.logo) return '';
    const version = profile?.updatedAt ? encodeURIComponent(profile.updatedAt) : '';
    if (!version) return profile.logo;
    const separator = profile.logo.includes('?') ? '&' : '?';
    return `${profile.logo}${separator}v=${version}`;
  }, [profile?.logo, profile?.updatedAt]);
  const resolvedLogoSrc = resolveImageUrl(logoSrc);

  const orgHandle = useMemo(() => {
    const raw = (profile?.name || 'organisation').trim().toLowerCase();
    if (!raw) return 'organisation';
    return raw.replace(/[^a-z0-9\s_]/g, '').replace(/\s+/g, '_');
  }, [profile?.name]);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const res = await getOrgProfile();
        setProfile(res.data);
        const profileForm = {
          name: res.data?.name || '',
          description: res.data?.description || '',
          bio: res.data?.bio || '',
          phoneNumber: res.data?.phoneNumber || '',
          location: res.data?.location || '',
          website: res.data?.website || ''
        };
        setForm(profileForm);

        const orgId = res.data?._id || res.data?.id;
        if (orgId) {
          const key = `organisation-profile:${orgId}`;
          setDraftKey(key);
          try {
            const draft = await loadFormDraft(key);
            if (!active) return;
            if (draft) {
              setForm({ ...profileForm, ...draft.data });
              setIsEditing(true);
              setDraftStatus('Your saved profile edits were restored. They are stored only in this browser.');
            }
          } catch (err) {
            if (active) setDraftStatus(err.message || 'Could not check for a saved profile draft.');
          }

          const [followersRes, followingRes] = await Promise.all([
            followService.getFollowers(orgId, 'Organisation', 6, 0),
            followService.getFollowing(orgId, 6, 0)
          ]);

          if (!active) return;
          setFollowers(followersRes?.data?.data?.followers || []);
          setFollowersTotal(followersRes?.data?.data?.total || 0);

          const followingItems = followingRes?.data?.data?.following || [];
          setFollowing(followingItems.map((item) => item?.following).filter(Boolean));
          setFollowingTotal(followingRes?.data?.data?.total || 0);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        if (active) {
          setDraftReady(true);
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftReady || !draftKey || !isEditing) return undefined;

    const timeout = setTimeout(() => {
      setDraftStatus('Saving your profile edits in this browser...');
      saveFormDraft(draftKey, form)
        .then(() => setDraftStatus('Profile edits saved in this browser.'))
        .catch((err) => setDraftStatus(err.message || 'Could not save a local profile draft.'));
    }, 500);

    return () => clearTimeout(timeout);
  }, [draftKey, draftReady, form, isEditing]);

  const handleChange = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value
    }));
  };

  const handleCancelEdit = async () => {
    setForm({
      name: profile?.name || '',
      description: profile?.description || '',
      bio: profile?.bio || '',
      phoneNumber: profile?.phoneNumber || '',
      location: profile?.location || '',
      website: profile?.website || ''
    });
    setError('');
    setIsEditing(false);
    try {
      if (draftKey) await clearFormDraft(draftKey);
      setDraftStatus('');
    } catch (err) {
      setDraftStatus(err.message || 'Could not discard the local profile draft.');
    }
  };

  const handleSaveProfile = async () => {
    setError('');
    setNotice('');

    if (!form.name.trim()) {
      setError('Organisation name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        bio: form.bio,
        phoneNumber: form.phoneNumber,
        location: form.location,
        website: form.website
      };
      const res = await updateOrgProfile(payload);
      const updated = res?.data || payload;
      setProfile((current) => ({
        ...(current || {}),
        ...updated
      }));
      setForm({
        name: updated.name || '',
        description: updated.description || '',
        bio: updated.bio || '',
        phoneNumber: updated.phoneNumber || '',
        location: updated.location || '',
        website: updated.website || ''
      });
      setNotice('Profile updated successfully.');
      setIsEditing(false);
      try {
        if (draftKey) await clearFormDraft(draftKey);
        setDraftStatus('');
      } catch (err) {
        setDraftStatus(`Profile saved, but the local draft could not be cleared: ${err.message}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setNotice('');
    setLogoUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await updateOrgLogo(formData);
      const nextLogo = res?.data?.logo || res?.logo;

      if (!nextLogo) {
        throw new Error('Logo upload succeeded but no image URL was returned');
      }

      setProfile((current) => ({
        ...(current || {}),
        logo: nextLogo,
        updatedAt: new Date().toISOString()
      }));
      setNotice('Profile image updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload profile image');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="fh-page">
      <Navbar />

      <div className="fh-section-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/org/settings')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fb-blue)',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              marginBottom: '6px'
            }}
          >
            ← Back to Menu
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {t('profile.title')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {t('profile.personalInfo')}
          </p>
        </div>
      </div>

      <div className="fh-container">
        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: 'var(--radius)',
            padding: '12px',
            color: 'var(--danger-text)',
            fontSize: '0.9rem',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-primary)',
            borderRadius: 'var(--radius)',
            padding: '12px',
            color: 'var(--success-text)',
            fontSize: '0.9rem',
            marginBottom: '12px'
          }}>
            {notice}
          </div>
        )}

        {draftStatus && (
          <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 12px' }}>
            {draftStatus}
          </p>
        )}

        {!error && (
          <div>
            <div style={{
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />

              <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                {logoSrc && failedLogoSrc !== resolvedLogoSrc ? (
                  <img
                    src={resolvedLogoSrc}
                    alt={profile.name}
                    onError={() => setFailedLogoSrc(resolvedLogoSrc)}
                    style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--fb-blue)' }}
                  />
                ) : (
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'var(--fb-blue)',
                    color: 'var(--text-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: '800',
                    border: '2px solid var(--fb-blue)'
                  }}>
                    {(profile?.name || 'O').charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  aria-label="Change profile image"
                  title="Change profile image"
                  style={{
                    position: 'absolute',
                    right: '-2px',
                    bottom: '-2px',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    border: '1px solid var(--fb-blue)',
                    background: 'var(--bg-card)',
                    color: 'var(--fb-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: logoUploading ? 'not-allowed' : 'pointer',
                    opacity: logoUploading ? 0.7 : 1,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h4l2-2h4l2 2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </button>
              </div>

              <div>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {profile?.name || 'Organisation'}
                </h2>
                <p style={{ color: 'var(--fb-blue)', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                  @{orgHandle}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 6px 0' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{followersTotal}</strong> followers · <strong style={{ color: 'var(--text-primary)' }}>{followingTotal}</strong> following
                </p>
                {profile?.bio && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                    margin: '0 0 6px 0',
                    maxWidth: '420px'
                  }}>
                    {profile.bio}
                  </p>
                )}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>{profile?.email}</p>
                {logoUploading && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--fb-blue)', marginTop: '8px' }}>Uploading image...</p>
                )}
              </div>

              <div style={{ marginLeft: 'auto' }}>
                {!isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <ShareButton
                      url={`${window.location.origin}/profiles/organisation/${profile?._id || profile?.id || ''}`}
                      title={profile?.name || 'Organisation on SkillBridge'}
                      text={profile?.description?.slice(0, 140) || profile?.bio?.slice(0, 140) || `${profile?.type || ''} on SkillBridge`}
                      compact
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNotice('');
                        setError('');
                        setIsEditing(true);
                      }}
                      style={{
                        border: '1px solid var(--fb-blue)',
                        background: 'var(--fb-blue-subtle)',
                        color: 'var(--fb-blue)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      style={{
                        border: '1px solid var(--border-color)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      style={{
                        border: '1px solid var(--fb-blue)',
                        background: 'var(--fb-blue)',
                        color: 'var(--text-on-primary)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '24px', display: 'grid', gap: '12px' }}>
              {[
                ['Type', profile?.type || 'N/A'],
                ['Status', profile?.status || 'N/A'],
                ['Notifications', profile?.notificationsEnabled ? 'Enabled' : 'Disabled']
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr',
                  gap: '12px',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}

              {(followers.length > 0 || following.length > 0) && (
                <div style={{ display: 'grid', gap: '10px', paddingTop: '6px' }}>
                  {followers.length > 0 && (
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Who follows you</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {followers.map((person) => (
                          <span key={person?._id || person?.id} style={{
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            borderRadius: '999px',
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {person?.fullName || person?.username || 'User'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {following.length > 0 && (
                    <div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Who you follow</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {following.map((target) => (
                          <span key={target?._id || target?.id} style={{
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            borderRadius: '999px',
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {target?.name || target?.fullName || target?.username || 'Profile'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEditing ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Organisation Name</span>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Organisation name"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Phone Number</span>
                    <input
                      name="phoneNumber"
                      value={form.phoneNumber}
                      onChange={handleChange}
                      placeholder="Phone number"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Location</span>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="Location"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Website</span>
                    <input
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="Website URL"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'start' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '10px' }}>Description</span>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Organisation description"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px', alignItems: 'start' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '10px' }}>Bio</span>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Short bio about your organisation"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {[
                    ['Phone Number', profile?.phoneNumber || 'N/A'],
                    ['Location', profile?.location || 'N/A'],
                    ['Website', profile?.website || 'N/A'],
                    ['Description', profile?.description || 'N/A'],
                    ['Bio', profile?.bio || 'N/A']
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      display: 'grid',
                      gridTemplateColumns: '170px 1fr',
                      gap: '12px',
                      fontSize: '0.9rem'
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
                      <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', wordBreak: 'break-word' }}>{value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={{
              padding: '24px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-card)'
            }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                {t('profile.helpSupport')}
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <details style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
                  <summary style={{ color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}>{t('profile.faqs')}</summary>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '8px' }}>
                    Visit the help center for account, applications, and notifications FAQs.
                  </p>
                </details>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href="mailto:support@fursahub.org"
                    style={{
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    {t('profile.contactUs')}
                  </a>

                  <a
                    href="https://fursahub.onrender.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    {t('profile.tutorials')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgProfile;
