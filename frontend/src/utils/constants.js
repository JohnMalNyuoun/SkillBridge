const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
export const API_URL = configuredApiUrl
  ? (configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`)
  : '/api';

export const COMMUNITY_TYPES = [
  { value: 'refugee', label: 'Refugee' },
  { value: 'host_community', label: 'Host Community' }
];

export const COURSE_CATEGORIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'language', label: 'Language' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' }
];

export const DELIVERY_MODES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' }
];

export const TARGET_AUDIENCES = [
  { value: 'refugee', label: 'Refugee Youth' },
  { value: 'host_community', label: 'Host Community Youth' },
  { value: 'both', label: 'Both' }
];

export const ORG_TYPES = [
  { value: 'NGO', label: 'NGO' },
  { value: 'CBO', label: 'CBO' },
  { value: 'UN_Agency', label: 'UN Agency' },
  { value: 'educational_institution', label: 'Educational Institution' },
  { value: 'other', label: 'Other' }
];