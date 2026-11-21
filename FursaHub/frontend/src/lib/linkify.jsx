import React from 'react';

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function normalize(href) {
  return /^https?:\/\//i.test(href) ? href : `https://${href}`;
}

function truncate(text, max = 60) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

export function Linkify({ text, className }) {
  if (!text) return null;
  const parts = String(text).split(URL_RE);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (URL_RE.test(part)) {
          URL_RE.lastIndex = 0;
          const href = normalize(part);
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline break-all hover:opacity-80"
              style={{ color: '#1D9E75' }}
            >
              {truncate(part)}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}

export function extractUrls(text) {
  if (!text) return [];
  const matches = String(text).match(URL_RE) || [];
  return [...new Set(matches.map(normalize))];
}
