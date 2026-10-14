import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const indexedPages = {
  '/': {
    title: 'SkillBridge | Courses and Opportunities in Kakuma',
    description:
      'Find courses, mentorship, and opportunities in Kakuma. SkillBridge connects young people with programmes from trusted NGOs and community organisations.',
  },
  '/updates': {
    title: 'SkillBridge Updates | Courses and Opportunities in Kakuma',
    description:
      'Read the latest SkillBridge announcements about courses, deadlines, youth programmes, and opportunities in Kakuma.',
  },
};

const siteUrl = import.meta.env.VITE_SITE_URL?.trim();
const siteOrigin = siteUrl
  ? (() => {
      const parsedUrl = new URL(siteUrl);
      if (
        !['https:', 'http:'].includes(parsedUrl.protocol) ||
        parsedUrl.pathname !== '/' ||
        parsedUrl.search ||
        parsedUrl.hash
      ) {
        throw new Error(
          'VITE_SITE_URL must be an absolute site origin, such as https://skillbridge.example.org.',
        );
      }
      return parsedUrl.origin;
    })()
  : null;

const setMetaContent = (selector, attributes, content) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, value),
    );
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const Seo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = indexedPages[pathname];

    if (!page) {
      document.title = 'SkillBridge';
      setMetaContent('meta[name="robots"]', { name: 'robots' }, 'noindex, nofollow');
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }

    document.title = page.title;
    setMetaContent('meta[name="description"]', { name: 'description' }, page.description);
    setMetaContent('meta[name="robots"]', { name: 'robots' }, 'index, follow');
    setMetaContent('meta[property="og:title"]', { property: 'og:title' }, page.title);
    setMetaContent(
      'meta[property="og:description"]',
      { property: 'og:description' },
      page.description,
    );
    setMetaContent(
      'meta[property="og:url"]',
      { property: 'og:url' },
      siteOrigin ? new URL(pathname, siteOrigin).href : window.location.href,
    );
    setMetaContent(
      'meta[property="og:image"]',
      { property: 'og:image' },
      new URL('/skillbridge-logo.jpg', siteOrigin || window.location.origin).href,
    );

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (siteOrigin) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = new URL(pathname, siteOrigin).href;
    } else {
      canonical?.remove();
    }
  }, [pathname]);

  return null;
};

export default Seo;
