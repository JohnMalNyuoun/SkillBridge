import { API_URL } from './constants';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');

export const resolveImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';

  const url = value.trim();
  if (url.startsWith('/api/images/')) return `${apiOrigin}${url}`;
  if (url.startsWith('//')) return `https:${url}`;
  return url.replace(/^http:\/\//, 'https://');
};
