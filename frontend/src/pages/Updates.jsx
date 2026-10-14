import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';
import ShareButton from '../components/common/ShareButton';
import BroadcastAuthor from '../components/common/BroadcastAuthor';
import { resolveImageUrl } from '../utils/imageUrl';

const stripEmoji = (str) =>
  str ? str.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s{2,}/g, ' ').trim() : str;

const Updates = () => {
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/broadcasts');
        if (!cancelled) setBroadcasts(res?.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      {/* Top bar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Non-clickable brand header */}
        <span style={{
          fontSize: '1.4rem',
          fontWeight: 900,
          color: 'var(--fb-blue)',
          letterSpacing: '-0.5px',
          userSelect: 'none'
        }}>
          SkillBridge
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/login" style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}>
            Sign In
          </Link>
          <Link to="/register" style={{
            background: 'var(--fb-blue)',
            color: 'var(--text-on-primary)',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, var(--bg-base) 0%, var(--fb-blue-subtle) 100%)',
        padding: '48px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: 'var(--fb-blue)',
            marginBottom: '10px',
            letterSpacing: '0.05em'
          }}>
            Public Feed
          </h3>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '12px',
            lineHeight: 1.2
          }}>
            Latest Updates
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Announcements from the SkillBridge team — open opportunities, deadlines, and platform news.
          </p>
        </div>
      </div>

      {/* Feed */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px 64px' }}>
        {loading ? (
          <Loader />
        ) : broadcasts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            No updates yet. Check back soon.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {broadcasts.map((b) => (
              <article
                key={b._id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px'
                }}
              >
                <BroadcastAuthor author={b.author} />
                <p style={{
                  fontSize: '0.78rem',
                  color: 'var(--fb-blue)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  {new Date(b.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric'
                  })}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <h2 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                    lineHeight: 1.3
                  }}>
                    {stripEmoji(b.title)}
                  </h2>
                  <ShareButton
                    url={`${window.location.origin}/updates`}
                    title={b.title}
                    text={b.message?.slice(0, 200)}
                    compact
                  />
                </div>
                <p style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  marginBottom: b.image ? '14px' : 0
                }}>
                  {stripEmoji(b.message)}
                </p>
                {b.image && (
                  <img
                    src={resolveImageUrl(b.image)}
                    alt={b.title}
                    style={{
                      display: 'block',
                      width: '100%',
                      maxHeight: '360px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Updates;