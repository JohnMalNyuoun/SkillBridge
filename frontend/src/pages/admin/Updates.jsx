import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import api from '../../services/api';
import BroadcastAuthor from '../../components/common/BroadcastAuthor';
import { resolveImageUrl } from '../../utils/imageUrl';

const AdminUpdates = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [broadcasts, setBroadcasts] = useState([]);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const fetchBroadcasts = async () => {
    try {
      const res = await api.get('/admin/broadcasts');
      setBroadcasts(res?.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setAudience('all');
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview('');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('message', message.trim());
      formData.append('audience', audience);
      if (imageFile) formData.append('image', imageFile);

      const res = await api.post('/admin/broadcasts', formData);
      const count = res?.data?.data?.recipientCount ?? 0;
      setNotice(`Update sent to ${count} recipient${count === 1 ? '' : 's'}.`);
      resetForm();
      await fetchBroadcasts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send update.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this update and remove it from all inboxes?')) return;
    try {
      await api.delete(`/admin/broadcasts/${id}`);
      setBroadcasts((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '14px 20px 0' }}>
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
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
          <span style={{ color: 'var(--fb-blue)', fontSize: '1rem', lineHeight: 1 }}>←</span>
          <span>Back</span>
        </button>
      </div>

      <div className="fh-container" style={{ maxWidth: '720px' }}>
        <div style={{ padding: '20px 0 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Post an Update
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Send announcements to youth and organisations on the platform.
          </p>
        </div>

        {notice && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--success-text)',
            marginBottom: '16px'
          }}>
            {notice}
          </div>
        )}
        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-primary)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--danger-text)',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', marginBottom: '32px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New scholarship round open"
              maxLength={140}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-section-alt)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share the details with your audience..."
              rows={5}
              maxLength={1200}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-section-alt)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-section-alt)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem'
              }}
            >
              <option value="all">Everyone (youth + organisations)</option>
              <option value="youth">Youth only</option>
              <option value="organisations">Organisations only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Image (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  display: 'block',
                  marginTop: '10px',
                  maxWidth: '100%',
                  maxHeight: '220px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'var(--fb-blue)',
                color: 'var(--text-on-primary)',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 22px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Sending…' : 'Send Update'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '12px 22px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </form>

        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Previous Updates
          </h2>
        </div>

        {broadcasts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No updates sent yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {broadcasts.map((b) => (
              <div
                key={b._id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '14px'
                }}
              >
                <BroadcastAuthor author={b.author} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>
                    {b.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(b._id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                  {b.message}
                </p>
                {b.image && (
                  <img
                    src={resolveImageUrl(b.image)}
                    alt={b.title}
                    style={{
                      marginTop: '10px',
                      maxWidth: '100%',
                      maxHeight: '240px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>
                  {new Date(b.createdAt).toLocaleString()} ·{' '}
                  {b.audience === 'all' ? 'Everyone' : b.audience === 'youth' ? 'Youth only' : 'Organisations only'}
                  {' · '}
                  {b.recipientCount || 0} recipient{(b.recipientCount || 0) === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUpdates;
