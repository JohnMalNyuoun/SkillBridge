import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import api from '../../services/api';
import { COURSE_CATEGORIES } from '../../utils/constants';

const Preferences = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/youth/profile');
        setSelected(res.data?.data?.categoryPreferences || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const toggleCategory = (value) => {
    setSelected((prev) => (
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    ));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/youth/profile/preferences', {
        categoryPreferences: selected
      });
      setSaved(true);
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <div className="fh-container" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/quick-access')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--fb-blue)',
              padding: 0,
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            ← Back
          </button>

          <h1 style={{
            fontSize: 'clamp(1.2rem, 3.4vw, 1.55rem)',
            fontWeight: 900,
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Your Interests
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.86rem',
            maxWidth: '700px',
            margin: 0
          }}>
            Select the categories you are interested in. FursaHub will notify you every time a matching course is posted in Kakuma.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'var(--fb-blue-subtle)',
          border: '1px solid var(--fb-blue-subtle)',
          color: 'var(--fb-blue)',
          borderRadius: '10px',
          padding: '10px 12px',
          marginBottom: '14px'
        }}>
          <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>🔔</span>
          <p style={{ fontSize: '0.88rem', color: 'var(--fb-blue)' }}>
            You will receive a notification every time an organisation posts a course in your selected categories. You can update these anytime.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
          marginBottom: '18px'
        }}>
          {COURSE_CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.value);

            return (
              <label
                key={cat.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 0',
                  cursor: 'pointer',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.9rem'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCategory(cat.value)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--fb-blue)', cursor: 'pointer' }}
                />
                <span>{cat.label}</span>
              </label>
            );
          })}
        </div>

        <p style={{
          color: selected.length === 0 ? 'var(--danger-text)' : 'var(--text-secondary)',
          fontSize: '0.86rem',
          marginBottom: '14px'
        }}>
          {selected.length === 0
            ? 'No categories selected - you will not receive course alerts.'
            : `${selected.length} categor${selected.length === 1 ? 'y' : 'ies'} selected`}
        </p>

        {saved ? (
          <div style={{
            background: 'var(--fb-blue-subtle)',
            border: '1px solid var(--fb-blue-subtle)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: 'var(--fb-blue)',
            fontWeight: 700,
            marginBottom: '28px'
          }}>
            ✓ Preferences saved! Redirecting...
          </div>
        ) : (
          <div style={{ marginBottom: '28px' }}>
            <Button
              onClick={handleSave}
              loading={saving}
              fullWidth
              style={{ maxWidth: '320px' }}
            >
              Save My Interests
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Preferences;
