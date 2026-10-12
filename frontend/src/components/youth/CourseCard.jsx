import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

const CourseCard = ({ course }) => {
  const isDeadlinePassed = new Date() > new Date(course.applicationDeadline);
  const isFull = course.filledSlots >= course.totalSlots;
  const imageCandidates = useMemo(() => {
    return [course.coverImage, course.organisation?.logo]
      .filter(Boolean)
      .map((url) => url.replace('http://', 'https://'));
  }, [course.coverImage, course.organisation?.logo]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [course._id, imageCandidates.length]);

  const cardImage = imageCandidates[imageIndex] || '';

  const status = isFull ? 'Full' : isDeadlinePassed ? 'Closed' : 'Open';
  const statusStyle = status === 'Open'
    ? { background: 'var(--fb-blue-subtle)', color: 'var(--fb-blue)' }
    : status === 'Full'
    ? { background: 'var(--danger-bg)', color: 'var(--danger-text)' }
    : { background: 'var(--bg-section-alt)', color: 'var(--text-muted)' };

  return (
    <Link to={`/courses/${course._id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          height: '100%',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.3)';
        }}
      >
        {cardImage ? (
          <img
            src={cardImage}
            alt={course.title}
            onError={() => {
              if (imageIndex < imageCandidates.length - 1) {
                setImageIndex((current) => current + 1);
              } else {
                setImageIndex(imageCandidates.length);
              }
            }}
            style={{
              width: 'calc(100% + 40px)',
              height: '180px',
              objectFit: 'cover',
              margin: '-20px -20px 16px',
              display: 'block',
              borderBottom: '1px solid var(--border-color)'
            }}
          />
        ) : (
          <div style={{
            width: 'calc(100% + 40px)',
            height: '180px',
            margin: '-20px -20px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(135deg, var(--bg-section-alt) 0%, var(--bg-card) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: '700'
          }}>
            Course Cover
          </div>
        )}

        {/* Category badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.7rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: 'var(--fb-blue-subtle)',
          color: 'var(--fb-blue)',
          marginBottom: '12px'
        }}>
          {course.category}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '6px',
          lineHeight: 1.3
        }}>
          {course.title}
        </h3>

        {/* Organisation */}
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--fb-blue)',
          fontWeight: 700,
          marginBottom: '14px'
        }}>
          {course.organisation?.name}
        </p>

        {/* Details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            📍 {course.location}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🎓 {course.deliveryMode.replace('_', ' ')}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            📅 Deadline: {new Date(course.applicationDeadline).toLocaleDateString()}
          </span>
        </div>

        {/* Bottom row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            fontWeight: 600
          }}>
            {course.totalSlots - course.filledSlots} slots left
          </span>

          <span style={{
            ...statusStyle,
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
