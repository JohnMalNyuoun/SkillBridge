import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import ShareButton from '../../components/common/ShareButton';
import { getYouthProfile, updateYouthProfile, updateYouthPhoto } from '../../services/profileService';
import * as followService from '../../services/followService';
import { COURSE_CATEGORIES } from '../../utils/constants';
import { resolveImageUrl } from '../../utils/imageUrl';
import useAuth from '../../hooks/useAuth';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../../utils/formDraftStorage';

const BIO_MAX_LENGTH = 101;

const editInputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '0.85rem'
};

const YouthProfile = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const photoInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await getYouthProfile();
      setProfile(res.data);
      updateUser({
        fullName: res.data.fullName,
        username: res.data.username,
        photo: res.data.photo,
        updatedAt: res.data.updatedAt || new Date().toISOString()
      });
      const profileForm = {
        username: res.data.username || '',
        bio: res.data.bio || '',
        dateOfBirth: res.data.dateOfBirth ? String(res.data.dateOfBirth).slice(0, 10) : '',
        phoneNumber: res.data.phoneNumber || '',
        visibilitySettings: {
          dateOfBirth: res.data.visibilitySettings?.dateOfBirth || 'private',
          email: res.data.visibilitySettings?.email || 'private',
          phoneNumber: res.data.visibilitySettings?.phoneNumber || 'private'
        }
      };
      setEditForm(profileForm);

      const userId = res.data?._id || res.data?.id;
      if (userId) {
        const key = `youth-profile:${userId}`;
        setDraftKey(key);
        try {
          const draft = await loadFormDraft(key);
          if (draft) {
            setEditForm({ ...profileForm, ...draft.data });
            setEditMode(true);
            setDraftStatus('Your saved profile edits were restored. They are stored only in this browser.');
          }
        } catch (err) {
          setDraftStatus(err.message || 'Could not check for a saved profile draft.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setDraftReady(true);
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    if (!draftReady || !draftKey || !editMode) return undefined;

    const timeout = setTimeout(() => {
      setDraftStatus('Saving your profile edits in this browser...');
      saveFormDraft(draftKey, editForm)
        .then(() => setDraftStatus('Profile edits saved in this browser.'))
        .catch((err) => setDraftStatus(err.message || 'Could not save a local profile draft.'));
    }, 500);

    return () => clearTimeout(timeout);
  }, [draftKey, draftReady, editForm, editMode]);

  useEffect(() => {
    const userId = profile?._id || profile?.id;
    if (!userId) return;

    let cancelled = false;

    const fetchFollowStats = async () => {
      try {
        const [followersRes, followingRes] = await Promise.all([
          followService.getFollowCount(userId, 'User'),
          followService.getFollowing(userId, 1, 0)
        ]);

        if (cancelled) return;

        setFollowerCount(followersRes?.data?.data?.count || 0);
        setFollowingCount(followingRes?.data?.data?.total || 0);
      } catch {
        if (cancelled) return;
        setFollowerCount(0);
        setFollowingCount(0);
      }
    };

    fetchFollowStats();

    return () => {
      cancelled = true;
    };
  }, [profile?._id, profile?.id]);

  const uploadProfilePhoto = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);

    const now = new Date().toISOString();
    const response = await updateYouthPhoto(formData);
    const photo = response?.data?.photo || response?.photo || response?.data?.data?.photo;
    if (!photo) throw new Error('Photo uploaded but no image URL was returned by the server.');
    setProfile((prev) => ({ ...prev, photo, updatedAt: now }));
    updateUser({ photo, updatedAt: now });
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setSaveError('');
    try {
      await uploadProfilePhoto(file);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to update profile photo');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    setSaveNotice('');
    try {
      if (editForm.bio.length > BIO_MAX_LENGTH) {
        setSaveError(`Bio must be ${BIO_MAX_LENGTH} characters or less.`);
        setSaving(false);
        return;
      }

      const payload = {
        bio: (editForm.bio || '').slice(0, BIO_MAX_LENGTH),
        dateOfBirth: editForm.dateOfBirth || null,
        phoneNumber: editForm.phoneNumber || '',
        visibilitySettings: {
          dateOfBirth: editForm.visibilitySettings?.dateOfBirth || 'private',
          email: editForm.visibilitySettings?.email || 'private',
          phoneNumber: editForm.visibilitySettings?.phoneNumber || 'private'
        },
        ...(editForm.username.trim() ? { username: editForm.username } : {})
      };

      const res = await updateYouthProfile(payload);
      const now = new Date().toISOString();
      setProfile((prev) => ({ ...prev, ...res.data, updatedAt: now }));
      updateUser({
        fullName: res.data.fullName,
        username: res.data.username,
        photo: res.data.photo,
        updatedAt: now
      });
      setSaveNotice('Profile updated successfully.');
      try {
        if (draftKey) await clearFormDraft(draftKey);
        setDraftStatus('');
      } catch (err) {
        setDraftStatus(`Profile saved, but the local draft could not be cleared: ${err.message}`);
      }
      setTimeout(() => setSaveNotice(''), 3000);
      setEditMode(false);   
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = async () => {
    setEditForm({
      username: profile?.username || '',
      bio: profile?.bio || '',
      dateOfBirth: profile?.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
      phoneNumber: profile?.phoneNumber || '',
      visibilitySettings: {
        dateOfBirth: profile?.visibilitySettings?.dateOfBirth || 'private',
        email: profile?.visibilitySettings?.email || 'private',
        phoneNumber: profile?.visibilitySettings?.phoneNumber || 'private'
      }
    });
    setEditMode(false);
    try {
      if (draftKey) await clearFormDraft(draftKey);
      setDraftStatus('');
    } catch (err) {
      setDraftStatus(err.message || 'Could not discard the local profile draft.');
    }
  };

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

  const categoryLabelMap = useMemo(
    () => Object.fromEntries(COURSE_CATEGORIES.map((item) => [item.value, item.label])),
    []
  );

  const photoVersionedSrc = useMemo(() => {
    if (!profile?.photo) return '';
    const version = profile?.updatedAt ? encodeURIComponent(profile.updatedAt) : '';
    if (!version) return profile.photo;
    const separator = profile.photo.includes('?') ? '&' : '?';
    return `${profile.photo}${separator}v=${version}`;
  }, [profile?.photo, profile?.updatedAt]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [profile?.photo]);

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      {error ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--danger-text)'
          }}>
            {error}
          </div>
        </div>
      ) : (
        <>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '14px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--fb-blue)', fontSize: '1rem', lineHeight: 1 }}>←</span>
                <span>{profile?.fullName || 'Youth Profile'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editMode) {
                    handleCancelEdit();
                  } else {
                    setEditMode(true);
                  }
                }}
                title={editMode ? 'Close edit' : 'Edit profile'}
                aria-label={editMode ? 'Close edit' : 'Edit profile'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  color: editMode ? 'var(--text-primary)' : 'var(--fb-blue)',
                  border: 'none',
                  padding: '2px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m14.06 4.94 3.75 3.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <ShareButton
                url={`${window.location.origin}/profiles/youth/${profile?._id || profile?.id || ''}`}
                title={profile?.fullName || 'Youth on FursaHub'}
                text={profile?.bio?.slice(0, 140) || 'On FursaHub'}
                compact
              />
            </div>
          </div>

          {/* Profile Header Section */}
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '28px 20px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              {/* Profile Photo */}
              <div style={{ position: 'relative', width: '128px', height: '128px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(true)}
                  title="View profile image"
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {profile?.photo && !photoFailed ? (
                    <img
                      src={resolveImageUrl(photoVersionedSrc)}
                      alt={profile.fullName}
                      onError={() => setPhotoFailed(true)}
                      style={{
                        width: '128px',
                        height: '128px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--fb-blue)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '128px',
                      height: '128px',
                      borderRadius: '50%',
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '2.2rem',
                      border: '3px solid var(--fb-blue)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
                    }}>
                      {initials}
                    </div>
                  )}
                </button>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  title="Change profile image"
                  aria-label="Change profile image"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    right: '2px',
                    bottom: '2px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--fb-blue)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: photoUploading ? 'not-allowed' : 'pointer',
                    opacity: photoUploading ? 0.6 : 1
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h3l1.2-2h7.6L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>

              {/* Username & Bio */}
              <div style={{ paddingBottom: '6px' }}>
                <p style={{ color: 'var(--fb-blue)', fontSize: '1rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                  @{profile?.username || 'username_not_set'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 6px 0' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{followerCount}</strong> followers · <strong style={{ color: 'var(--text-primary)' }}>{followingCount}</strong> following
                </p>
                {profile?.bio && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.86rem',
                    lineHeight: 1.4,
                    margin: '0 0 12px 0',
                    maxWidth: '420px'
                  }}>
                    {profile.bio}
                  </p>
                )}

                {!editMode && saveError ? (
                  <p style={{ color: 'var(--danger-text)', fontSize: '0.78rem', margin: '6px 0 0 0' }}>{saveError}</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 20px' }}>
            {editMode ? (
              <div style={{
                padding: '0',
                maxWidth: '560px',
                margin: '0 auto'
              }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 800, marginBottom: '14px' }}>
                  Edit
                </h2>

                {saveError && (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-primary)', borderRadius: '8px', padding: '10px', color: 'var(--danger-text)', marginBottom: '12px', fontSize: '0.82rem' }}>
                    {saveError}
                  </div>
                )}
                {saveNotice && (
                  <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-primary)', borderRadius: '8px', padding: '10px', color: 'var(--success-text)', marginBottom: '12px', fontSize: '0.82rem' }}>
                    {saveNotice}
                  </div>
                )}
                {draftStatus && (
                  <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 12px' }}>
                    {draftStatus}
                  </p>
                )}

                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Username</label>
                    <input style={editInputStyle} value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} placeholder="your_username" />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Date of Birth</label>
                    <input type="date" style={editInputStyle} value={editForm.dateOfBirth || ''} onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Phone</label>
                    <input style={editInputStyle} value={editForm.phoneNumber || ''} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} placeholder="+255..." />
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Bio</label>
                    <textarea
                      rows={3}
                      maxLength={BIO_MAX_LENGTH}
                      style={editInputStyle}
                      value={editForm.bio}
                      onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX_LENGTH) }))}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 0 0', textAlign: 'right' }}>
                      {(editForm.bio || '').length}/{BIO_MAX_LENGTH}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 8px 0' }}>Visibility</p>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Date of Birth visibility</label>
                        <select
                          style={editInputStyle}
                          value={editForm.visibilitySettings?.dateOfBirth || 'private'}
                          onChange={(e) => setEditForm((f) => ({
                            ...f,
                            visibilitySettings: { ...(f.visibilitySettings || {}), dateOfBirth: e.target.value }
                          }))}
                        >
                          <option value="public">Public</option>
                          <option value="mutual">Mutual follow only</option>
                          <option value="private">Private (hidden)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Email visibility</label>
                        <select
                          style={editInputStyle}
                          value={editForm.visibilitySettings?.email || 'private'}
                          onChange={(e) => setEditForm((f) => ({
                            ...f,
                            visibilitySettings: { ...(f.visibilitySettings || {}), email: e.target.value }
                          }))}
                        >
                          <option value="public">Public</option>
                          <option value="mutual">Mutual follow only</option>
                          <option value="private">Private (hidden)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block', marginBottom: '4px' }}>Phone visibility</label>
                        <select
                          style={editInputStyle}
                          value={editForm.visibilitySettings?.phoneNumber || 'private'}
                          onChange={(e) => setEditForm((f) => ({
                            ...f,
                            visibilitySettings: { ...(f.visibilitySettings || {}), phoneNumber: e.target.value }
                          }))}
                        >
                          <option value="public">Public</option>
                          <option value="mutual">Mutual follow only</option>
                          <option value="private">Private (hidden)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                      flex: 1,
                      background: 'var(--fb-blue)',
                      color: 'var(--text-on-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '11px',
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '11px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <section style={{ display: 'grid', gap: '20px' }}>
                {/* Personal Information */}
                <div style={{
                  padding: '2px 2px 6px'
                }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '10px' }}>
                    Info
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    {[
                      ['Date of Birth', profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'],
                      ['Gender', profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'N/A'],
                      ['Email', profile?.email || 'N/A'],
                      ['Phone', profile?.phoneNumber || 'N/A'],
                      ['Language', profile?.language || 'N/A'],
                      ['Community', profile?.communityType ? profile.communityType.replace('_', ' ').charAt(0).toUpperCase() + profile.communityType.slice(1).replace('_', ' ') : 'N/A']
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 700, margin: '0 0 3px 0' }}>{label}</p>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, margin: 0, wordBreak: 'break-word' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Interests */}
                <div style={{ padding: '0' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '10px' }}>
                    My Interests
                  </h3>

                  {profile?.categoryPreferences && profile.categoryPreferences.length > 0 ? (
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {profile.categoryPreferences.map((category) => (
                        <p
                          key={category}
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            margin: 0
                          }}
                        >
                          {categoryLabelMap[category] || category}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No interests selected yet.</p>
                  )}
                </div>

                {/* Courses Attended */}
                <div style={{
                  padding: '0'
                }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '0.98rem', fontWeight: 800, marginBottom: '12px' }}>
                    Courses
                  </h3>
                  {profile?.enrolledCourses && profile.enrolledCourses.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {profile.enrolledCourses.map((course, index) => (
                        <div key={course._id || index} style={{
                          padding: '12px 0',
                          borderBottom: index < profile.enrolledCourses.length - 1 ? '1px solid var(--border-color)' : 'none'
                        }}>
                          <p style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                            {course.title || course.name || 'Course Name'}
                          </p>
                          <p style={{ margin: '0 0 3px 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                            {course.description || 'No details'}
                          </p>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {course.status && <span>Status: <strong style={{ color: 'var(--fb-blue)' }}>{course.status}</strong></span>}
                            {course.progress && <span>Progress: <strong style={{ color: 'var(--fb-blue)' }}>{course.progress}%</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No courses yet.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Photo Preview Modal */}
          {showPhotoPreview && (
            <div
              onClick={() => setShowPhotoPreview(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1200,
                padding: '20px'
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '18px',
                  padding: '20px',
                  maxWidth: '500px',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                {profile?.photo && !photoFailed ? (
                  <img
                    src={resolveImageUrl(photoVersionedSrc)}
                    alt={profile?.fullName || 'Profile photo'}
                    style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }}
                  />
                ) : (
                  <div style={{
                    width: '220px',
                    height: '220px',
                    margin: '0 auto',
                    borderRadius: '50%',
                    background: 'var(--fb-blue)',
                    color: 'var(--text-on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '3rem'
                  }}>
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(false)}
                  style={{
                    marginTop: '16px',
                    background: 'var(--fb-blue)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default YouthProfile;
