const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PostHog } = require('posthog-node');

if (!process.env.POSTHOG_API_KEY) {
  console.warn('[posthog] POSTHOG_API_KEY is not set — events will be silently dropped.');
} else {
  console.log('[posthog] client initialised host=%s', process.env.POSTHOG_HOST || 'default');
}

const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
  host: process.env.POSTHOG_HOST,
  enableExceptionAutocapture: true
});

module.exports = posthog;
