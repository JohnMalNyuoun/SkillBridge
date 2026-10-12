<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the FursaHub Node.js backend. A singleton PostHog client was added in `config/posthog.js` and wired into Express via `setupExpressRequestContext` (automatically reads `X-POSTHOG-SESSION-ID` and `X-POSTHOG-DISTINCT-ID` headers from the frontend for cross-domain session correlation) and `setupExpressErrorHandler` (captures unhandled Express errors to PostHog Error Tracking). Fifteen business events were instrumented across six controller files covering the full user lifecycle: registration and login for both youth and organisations, the course creation and publishing workflow, the application submission-to-acceptance funnel, and the post-course outcome submission.

| Event name | Description | File |
|---|---|---|
| `youth registered` | A youth user successfully creates a new account. | `controllers/auth/youthAuth.js` |
| `youth logged in` | A youth user successfully authenticates and receives a session token. | `controllers/auth/youthAuth.js` |
| `org registered` | An organisation submits a registration request awaiting admin approval. | `controllers/auth/orgAuth.js` |
| `org logged in` | An approved organisation successfully authenticates. | `controllers/auth/orgAuth.js` |
| `org reinstatement requested` | A suspended organisation submits a reinstatement request to admins. | `controllers/auth/orgAuth.js` |
| `course application submitted` | A youth user applies for a published course. | `controllers/youth/applications.js` |
| `course application withdrawn` | A youth user withdraws their pending course application. | `controllers/youth/applications.js` |
| `application shortlisted` | An organisation shortlists a youth applicant for a course. | `controllers/organisation/applications.js` |
| `application accepted` | An organisation accepts a youth applicant for a course. | `controllers/organisation/applications.js` |
| `application rejected` | An organisation rejects a youth applicant for a course. | `controllers/organisation/applications.js` |
| `course created` | An organisation creates a new course draft. | `controllers/organisation/courses.js` |
| `course published` | An organisation publishes a course making it visible to youth. | `controllers/organisation/courses.js` |
| `course closed` | An organisation closes a published course to new applications. | `controllers/organisation/courses.js` |
| `outcome submitted` | A youth user completes and submits an outcome form after finishing a course. | `controllers/youth/outcome.js` |
| `admin broadcast sent` | An admin sends a platform-wide broadcast notification to users. | `controllers/admin/broadcasts.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/483909/dashboard/1754006)
- [New Signups Over Time](https://us.posthog.com/project/483909/insights/85n4FAgd)
- [Course Application Funnel](https://us.posthog.com/project/483909/insights/eVWqGwBU)
- [Application Decisions: Accepted vs Rejected](https://us.posthog.com/project/483909/insights/8FE596MK)
- [Courses Published Per Week](https://us.posthog.com/project/483909/insights/eIsbvFZV)
- [Application Withdrawals (Churn)](https://us.posthog.com/project/483909/insights/Tj1hL7yB)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs. Consider adding `posthog.identify()` to the JWT middleware (`middleware/auth.js`) so every authenticated request re-associates the session.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
