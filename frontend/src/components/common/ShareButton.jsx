import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { capture } from '../../lib/posthog';

const SHARE_TARGETS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    build: ({ url, title, text }) =>
      `https://wa.me/?text=${encodeURIComponent(`${title ? `${title} — ` : ''}${text || ''} ${url}`.trim())}`
  },
  {
    key: 'facebook',
    label: 'Facebook',
    build: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    build: ({ url, title, text }) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || text || '')}`
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    build: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  },
  {
    key: 'telegram',
    label: 'Telegram',
    build: ({ url, title, text }) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title || ''} ${text || ''}`.trim())}`
  },
  {
    key: 'email',
    label: 'Email',
    build: ({ url, title, text }) =>
      `mailto:?subject=${encodeURIComponent(title || 'SkillBridge')}&body=${encodeURIComponent(`${text ? `${text}\n\n` : ''}${url}`)}`
  }
];

const ShareButton = ({
  url,
  title,
  text,
  label = 'Share',
  compact = false,
  entityType = 'page',
  entityId = null,
  style: extraStyle
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  const resolvedUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '');

  const recordShare = (target) => {
    capture('share_clicked', { entityType, entityId, target, url: resolvedUrl });
    api.post('/track/share', {
      entityType,
      entityId,
      target,
      url: resolvedUrl
    }).catch(() => { /* tracking is best-effort */ });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const tryNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: resolvedUrl });
        recordShare('native');
        return true;
      } catch (err) {
        if (err?.name === 'AbortError') return true;
      }
    }
    return false;
  };

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const shared = await tryNativeShare();
    if (!shared) setOpen((v) => !v);
  };

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      recordShare('copy_link');
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const openTarget = (target) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const href = target.build({ url: resolvedUrl, title, text });
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=540');
    recordShare(target.key);
    setOpen(false);
  };

  return (
    <span ref={containerRef} style={{ position: 'relative', display: 'inline-block', ...extraStyle }}>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Share"
        style={{
          background: compact ? 'transparent' : 'rgba(24, 119, 242, 0.15)',
          color: 'var(--fb-blue)',
          border: compact ? '1px solid var(--border-color)' : '1px solid rgba(24, 119, 242, 0.35)',
          borderRadius: '999px',
          padding: compact ? '6px 12px' : '8px 14px',
          fontSize: compact ? '0.78rem' : '0.84rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 60,
            minWidth: '180px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: '6px',
            display: 'grid',
            gap: '2px'
          }}
        >
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.key}
              type="button"
              role="menuitem"
              onClick={openTarget(target)}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-section-alt)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {target.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            style={{
              background: 'transparent',
              color: copied ? 'var(--success-primary)' : 'var(--fb-blue)',
              border: 'none',
              borderTop: '1px solid var(--border-color)',
              textAlign: 'left',
              padding: '8px 10px',
              marginTop: '2px',
              fontSize: '0.84rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-section-alt)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </span>
  );
};

export default ShareButton;
