import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Linkify, extractUrls } from '../lib/linkify';
import FollowButton from '../components/FollowButton';
import ConnectPanel from '../components/ConnectPanel';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'training', label: 'ICT' },
  { value: 'internship', label: 'Vocational' },
  { value: 'job', label: 'Business' },
  { value: 'scholarship', label: 'Academic' },
];

const FALLBACK_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDwOHEw6eY4M_QhFoONzbZypMosdAas9CkRcUlZ2RXKIZDQdSvRiHwQ5kwkb8XsTyBa6OfUv5_K78vWDNjwJesIo9YFtA0C_ECcgb7iShVfjMw-t6U22vRjoYmNIyYdyPYZxTGwjZUnaTp_FucXQ1_PvKdblhVBH-j5mqqPTlK7YMUlFKl-ShwXGKgycKKDzVG1XD4bU2IxVZTyIiaPYmzKfu5rUSyjtG9mW1SPfJx5sTxRJAP4HRsYlY2LYFQsZLjyUHbcjFLINR4';

const TYPE_LABEL = {
  training: 'Training',
  internship: 'Internship',
  job: 'Job',
  scholarship: 'Scholarship',
};

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Math.max(0, Date.now() - d);
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Explore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setRightRail } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  async function load(type, { silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/opportunities', {
        params: { status: 'published', _ts: Date.now(), ...(type ? { type } : {}) },
      });
      setItems(data.items || []);
      setRefreshedAt(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  useEffect(() => {
    function onFocus() { load(filter, { silent: true }); }
    function onVisible() { if (document.visibilityState === 'visible') load(filter, { silent: true }); }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [filter]);

  useEffect(() => {
    if (typeof setRightRail !== 'function') return undefined;
    setRightRail(<ExploreRightRail items={items} />);
    return () => setRightRail(null);
  }, [setRightRail, items]);

  async function apply(opp) {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'student') { alert('Only students can apply.'); return; }
    setApplyingId(opp._id);
    try {
      await api.post('/applications', { opportunityId: opp._id });
      alert('Application submitted!');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setApplyingId(null);
    }
  }

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <div className="-mx-lg md:-mx-xl -my-lg md:-my-xl bg-[#f3f2ef] min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-md py-md space-y-md">
        {/* Post composer */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-md">
          <div className="flex items-center space-x-md mb-sm">
            <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0">
              {initial}
            </div>
            <button
              type="button"
              onClick={() => navigate('/inspire')}
              className="flex-grow text-left bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-full py-[10px] px-lg text-on-surface-variant text-body-sm font-medium transition-all"
            >
              Start a post about your learning journey...
            </button>
          </div>
          <div className="flex justify-between items-center pt-xs flex-wrap gap-xs">
            <button
              type="button"
              onClick={() => navigate('/inspire')}
              className="flex items-center space-x-sm px-sm py-xs rounded hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
              <span className="text-body-sm font-label-md">Photo</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inspire')}
              className="flex items-center space-x-sm px-sm py-xs rounded hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_display</span>
              <span className="text-body-sm font-label-md">Video</span>
            </button>
            <button
              type="button"
              onClick={() => user?.role === 'admin' ? navigate('/opportunities/new') : navigate('/inspire')}
              className="flex items-center space-x-sm px-sm py-xs rounded hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
              <span className="text-body-sm font-label-md">Event</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inspire')}
              className="flex items-center space-x-sm px-sm py-xs rounded hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[#e06847]" style={{ fontVariationSettings: "'FILL' 1" }}>article</span>
              <span className="text-body-sm font-label-md">Write article</span>
            </button>
          </div>
        </div>

        {/* Connect & follow strip */}
        <ConnectPanel />

        {/* Filter chips */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-sm flex items-center gap-sm flex-wrap">
          <div className="flex gap-sm overflow-x-auto no-scrollbar flex-1">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value || 'all'}
                  onClick={() => setFilter(f.value)}
                  className={`px-md py-xs rounded-full font-label-md whitespace-nowrap text-body-sm transition-colors ${
                    active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => load(filter)}
            disabled={loading}
            title={refreshedAt ? `Last updated ${refreshedAt.toLocaleTimeString()}` : 'Refresh'}
            className="shrink-0 p-xs rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>

        {loading && (
          <div className="py-xl flex justify-center">
            <span className="material-symbols-outlined animate-spin text-secondary">refresh</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-xl text-center">
            <span className="material-symbols-outlined text-4xl mb-md text-secondary">inbox</span>
            <h4 className="font-headline-sm">No opportunities yet</h4>
            <p className="text-body-sm text-on-surface-variant mt-sm">
              Check back soon — admins post new opportunities regularly.
            </p>
          </div>
        )}

        {items.map((opp) => (
          <OpportunityCard
            key={opp._id}
            opp={opp}
            user={user}
            applying={applyingId === opp._id}
            onApply={() => apply(opp)}
          />
        ))}

        <article className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg text-center">
          <span className="material-symbols-outlined text-4xl mb-md text-secondary">verified_user</span>
          <h4 className="font-headline-sm mb-sm">Inspire Others</h4>
          <p className="text-body-sm text-on-surface-variant mb-md max-w-sm mx-auto">
            Have you completed a course? Share your impact story with the community.
          </p>
          <Link to="/inspire" className="font-bold text-secondary hover:underline">Post an Update →</Link>
        </article>
      </div>
    </div>
  );
}

function OpportunityCard({ opp, user, applying, onApply }) {
  const daysLeft = opp.deadline
    ? Math.ceil((new Date(opp.deadline) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const orgName = opp.organization || 'Fursahub Partner';
  const orgInitial = orgName[0]?.toUpperCase() || 'F';
  const inlineUrls = extractUrls(opp.description);
  const extras = inlineUrls.filter((u) => !opp.applicationUrl || u !== opp.applicationUrl);
  const typeLabel = TYPE_LABEL[opp.type] || opp.type;
  const canApply = user?.role !== 'admin';

  return (
    <article className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
      <div className="p-md">
        <div className="flex justify-between items-start mb-sm">
          <div className="flex items-center min-w-0">
            <Link
              to={opp.postedBy ? `/profile/${opp.postedBy}` : '#'}
              className="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center font-bold text-primary mr-sm overflow-hidden shrink-0"
            >
              {orgInitial}
            </Link>
            <div className="min-w-0">
              <h4 className="text-body-md font-bold text-on-surface flex items-center gap-xs flex-wrap">
                {opp.postedBy ? (
                  <Link to={`/profile/${opp.postedBy}`} className="hover:underline truncate">{orgName}</Link>
                ) : (
                  <span className="truncate">{orgName}</span>
                )}
                {opp.postedBy && (
                  <>
                    <span className="text-on-surface-variant font-normal">•</span>
                    <FollowButton targetId={opp.postedBy} targetName={orgName} />
                  </>
                )}
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                {typeLabel} • {opp.visibility === 'followers' ? 'Followers only' : 'Public'}
              </p>
              <p className="text-[11px] text-on-surface-variant flex items-center">
                {relativeTime(opp.createdAt)}
                <span className="material-symbols-outlined !text-[12px] ml-[2px]">
                  {opp.visibility === 'followers' ? 'lock' : 'public'}
                </span>
              </p>
            </div>
          </div>
          <button className="p-xs hover:bg-surface-container rounded-full transition-colors text-on-surface-variant" aria-label="More options">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>

        <p className="text-body-sm text-on-surface mb-md whitespace-pre-wrap">
          <Linkify text={opp.description} />
        </p>

        {(opp.applicationUrl || extras.length > 0) && (
          <div className="flex flex-wrap gap-sm mb-sm">
            {opp.applicationUrl && (
              <a
                href={opp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-sm font-bold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">link</span>
                Application link
              </a>
            )}
            {extras.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-sm font-bold bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                {(() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })()}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="relative group cursor-pointer">
        <img
          src={FALLBACK_IMG}
          alt={opp.title}
          className="w-full h-[260px] md:h-[320px] object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="p-md bg-surface-container-low flex justify-between items-center gap-md">
        <div className="min-w-0">
          <h5 className="text-body-md font-bold text-on-surface truncate">{opp.title}</h5>
          <p className="text-body-sm text-on-surface-variant">
            {daysLeft != null && daysLeft >= 0
              ? (daysLeft <= 0 ? 'Closing today' : `Ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`)
              : 'Certificate of Completion'}
          </p>
        </div>
        {canApply && (
          <button
            onClick={onApply}
            disabled={applying}
            className="bg-secondary hover:brightness-110 text-on-secondary px-lg py-sm rounded-full font-label-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {applying ? 'Applying…' : 'Apply Now'}
          </button>
        )}
      </div>

      <div className="px-md py-sm border-t border-outline-variant flex justify-between items-center text-[12px] text-on-surface-variant">
        <div className="flex items-center min-w-0">
          <div className="flex -space-x-xs mr-sm shrink-0">
            <span className="material-symbols-outlined !text-[14px] bg-primary text-white p-[2px] rounded-full" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
            <span className="material-symbols-outlined !text-[14px] bg-secondary text-white p-[2px] rounded-full" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
          <span className="truncate">Endorsed by Fursahub partners</span>
        </div>
        <div className="hidden sm:block shrink-0">
          <span>{typeLabel}</span>
          {daysLeft != null && daysLeft >= 0 && <span> • {daysLeft <= 0 ? 'Closes today' : `${daysLeft}d left`}</span>}
        </div>
      </div>

      <div className="px-md pb-xs border-t border-outline-variant flex justify-between">
        <button
          type="button"
          title="Coming soon"
          className="flex items-center space-x-sm px-md py-sm rounded hover:bg-surface-container-high transition-colors text-on-surface-variant font-label-md"
        >
          <span className="material-symbols-outlined">thumb_up</span>
          <span className="hidden sm:inline">Like</span>
        </button>
        <button
          type="button"
          title="Coming soon"
          className="flex items-center space-x-sm px-md py-sm rounded hover:bg-surface-container-high transition-colors text-on-surface-variant font-label-md"
        >
          <span className="material-symbols-outlined">comment</span>
          <span className="hidden sm:inline">Comment</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            const url = `${window.location.origin}/explore#${opp._id}`;
            try {
              if (navigator.share) {
                await navigator.share({ title: opp.title, url });
              } else {
                await navigator.clipboard.writeText(url);
                alert('Link copied');
              }
            } catch { /* dismissed */ }
          }}
          className="flex items-center space-x-sm px-md py-sm rounded hover:bg-surface-container-high transition-colors text-on-surface-variant font-label-md"
        >
          <span className="material-symbols-outlined">share</span>
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          type="button"
          title="Coming soon"
          className="flex items-center space-x-sm px-md py-sm rounded hover:bg-surface-container-high transition-colors text-on-surface-variant font-label-md"
        >
          <span className="material-symbols-outlined">send</span>
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </article>
  );
}

function ExploreRightRail({ items }) {
  const [suggestions, setSuggestions] = useState({ organizations: [], members: [] });

  useEffect(() => {
    let cancelled = false;
    api.get('/users/directory', { params: { orgLimit: 5, memberLimit: 5 } })
      .then(({ data }) => { if (!cancelled) setSuggestions(data || { organizations: [], members: [] }); })
      .catch(() => { /* anonymous viewers get nothing */ });
    return () => { cancelled = true; };
  }, []);

  const peopleSuggestions = [
    ...suggestions.organizations.slice(0, 1),
    ...suggestions.members.slice(0, 1),
  ].filter(Boolean);

  const trending = (items || []).slice(0, 3);

  return (
    <>
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-md">
        <div className="flex items-center justify-between mb-md">
          <h4 className="text-body-md font-bold text-on-surface">Add to your feed</h4>
          <span className="material-symbols-outlined text-on-surface-variant !text-[18px]">info</span>
        </div>
        {peopleSuggestions.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Suggestions will appear once people post.</p>
        ) : (
          <div className="space-y-lg">
            {peopleSuggestions.map((u) => (
              <div key={u._id} className="flex items-start space-x-sm">
                <Link
                  to={`/profile/${u._id}`}
                  className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shrink-0"
                >
                  {u.name?.[0]?.toUpperCase() || '?'}
                </Link>
                <div className="flex-grow min-w-0">
                  <Link to={`/profile/${u._id}`} className="block">
                    <h5 className="text-body-sm font-bold text-on-surface leading-tight truncate hover:underline">
                      {u.name || 'Member'}
                    </h5>
                  </Link>
                  <p className="text-[11px] text-on-surface-variant leading-tight mb-sm capitalize">
                    {u.role || 'member'} on Fursahub
                  </p>
                  <FollowButton targetId={u._id} targetName={u.name} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          to="/explore"
          className="mt-lg flex items-center text-on-surface-variant text-body-sm font-label-md hover:text-primary transition-colors"
        >
          View all recommendations
          <span className="material-symbols-outlined !text-[18px] ml-xs">arrow_forward</span>
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-md">
        <h4 className="text-body-md font-bold text-on-surface mb-md">Trending Courses</h4>
        {trending.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No active courses right now.</p>
        ) : (
          <div className="space-y-md">
            {trending.map((opp, idx) => (
              <Link to="/explore" key={opp._id} className="block group">
                <p className="text-body-sm font-bold group-hover:underline group-hover:text-primary truncate">
                  #{idx + 1} {opp.title}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {opp.organization || 'Fursahub'} • {TYPE_LABEL[opp.type] || opp.type}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="px-md flex flex-wrap justify-center gap-x-md gap-y-xs">
        <a className="text-[11px] text-on-surface-variant hover:underline" href="#">About</a>
        <a className="text-[11px] text-on-surface-variant hover:underline" href="#">Accessibility</a>
        <a className="text-[11px] text-on-surface-variant hover:underline" href="#">Help Center</a>
        <a className="text-[11px] text-on-surface-variant hover:underline" href="#">Privacy &amp; Terms</a>
        <div className="w-full flex justify-center items-center mt-sm">
          <span className="font-headline-sm text-primary font-extrabold text-[12px] opacity-70">Fursahub</span>
          <span className="text-[11px] text-on-surface-variant ml-xs">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </>
  );
}
