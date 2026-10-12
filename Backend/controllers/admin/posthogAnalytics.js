const { success, error } = require('../../utils/apiResponse');

const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const API_HOST = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '');

const QUERY_TIMEOUT_MS = 8000;

const isConfigured = () => Boolean(PROJECT_ID && PERSONAL_KEY);

async function runHogQL(sql) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERSONAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`PostHog query ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.results || [];
  } finally {
    clearTimeout(timer);
  }
}

// @desc    Aggregated metrics sourced from PostHog HogQL
// @route   GET /api/admin/analytics/posthog
// @access  Admin
const getPostHogAnalytics = async (req, res) => {
  if (!isConfigured()) {
    return success(res, 200, 'PostHog analytics not configured', {
      configured: false,
      hint: 'Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY (with query:read scope) in Backend/.env'
    });
  }

  try {
    const dailyQ = `
      SELECT toDate(timestamp) AS day, event, count() AS cnt
      FROM events
      WHERE event IN ('org registered','youth registered','course viewed','course application submitted')
        AND timestamp > now() - INTERVAL 14 DAY
      GROUP BY day, event
      ORDER BY day ASC
    `;
    const topCoursesQ = `
      SELECT properties.course_title AS course, count() AS views
      FROM events
      WHERE event = 'course viewed' AND timestamp > now() - INTERVAL 30 DAY
      GROUP BY course
      ORDER BY views DESC
      LIMIT 5
    `;
    const viewsQ = `
      SELECT count() AS c FROM events
      WHERE event = 'course viewed' AND timestamp > now() - INTERVAL 30 DAY
    `;
    const appliesQ = `
      SELECT count() AS c FROM events
      WHERE event = 'course application submitted' AND timestamp > now() - INTERVAL 30 DAY
    `;
    const adminsQ = `
      SELECT person.properties.email AS email, count() AS actions
      FROM events
      WHERE event IN ('admin org approved','admin org rejected','admin org suspended','admin org reinstated')
        AND timestamp > now() - INTERVAL 30 DAY
      GROUP BY email
      ORDER BY actions DESC
      LIMIT 5
    `;

    const [dailyRows, topCoursesRows, viewsRows, appliesRows, adminsRows] = await Promise.all([
      runHogQL(dailyQ),
      runHogQL(topCoursesQ),
      runHogQL(viewsQ),
      runHogQL(appliesQ),
      runHogQL(adminsQ)
    ]);

    const dailyEvents = dailyRows.map(([day, event, cnt]) => ({
      day: day instanceof Date ? day.toISOString().slice(0, 10) : String(day),
      event,
      count: Number(cnt) || 0
    }));

    const topCourses = topCoursesRows
      .map(([course, views]) => ({ course: course || '(unknown)', views: Number(views) || 0 }))
      .filter((r) => r.views > 0);

    const views = Number(viewsRows?.[0]?.[0]) || 0;
    const applies = Number(appliesRows?.[0]?.[0]) || 0;
    const ratePct = views > 0 ? Math.round((applies / views) * 100) : 0;

    const topAdmins = adminsRows.map(([email, actions]) => ({
      email: email || '(unknown)',
      actions: Number(actions) || 0
    }));

    return success(res, 200, 'PostHog analytics', {
      configured: true,
      window: { dailyDays: 14, snapshotDays: 30 },
      dailyEvents,
      topCourses,
      conversion: { views, applies, ratePct },
      topAdmins,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    return error(res, 502, `PostHog query failed: ${err.message}`);
  }
};

module.exports = { getPostHogAnalytics };
