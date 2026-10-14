import { useState } from 'react';
import { resolveImageUrl } from '../../utils/imageUrl';

const BroadcastAuthor = ({ author }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const name = author?.fullName || 'SkillBridge Team';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const imageUrl = author?.photo ? resolveImageUrl(author.photo) : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--fb-blue-subtle)',
        color: 'var(--fb-blue)',
        border: '1px solid var(--border-color)',
        fontSize: '0.82rem',
        fontWeight: 800
      }}>
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={`${name} profile picture`}
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials || 'S'
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          color: 'var(--text-primary)',
          fontSize: '0.88rem',
          fontWeight: 800,
          margin: 0
        }}>
          {name}
        </p>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.76rem',
          margin: '3px 0 0'
        }}>
          {author?.fullName ? 'SkillBridge Admin' : 'SkillBridge Team'}
        </p>
      </div>
    </div>
  );
};

export default BroadcastAuthor;
