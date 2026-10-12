import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialised = false;

export function initPosthog() {
  if (initialised || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
  initialised = true;
}

export function identifyUser(user) {
  if (!initialised || !user) return;
  const id = user._id || user.id || user.email;
  if (!id) return;
  posthog.identify(String(id), {
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export function resetPosthog() {
  if (!initialised) return;
  posthog.reset();
}

export function capture(event, props) {
  if (!initialised) return;
  posthog.capture(event, props);
}

export default posthog;
