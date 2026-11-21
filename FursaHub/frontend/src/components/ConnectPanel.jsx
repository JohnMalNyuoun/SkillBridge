import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import FollowButton from './FollowButton';

const PRIMARY = '#059669';
const STRIP_LIMIT = 8;

/**
 * Connect & Follow strip for the Explore page.
 * Shows a horizontal scroll of suggested orgs/people and a "See all" modal
 * with a searchable grid of the full directory.
 */
export default function ConnectPanel() {
  const [data, setData] = useState({ organizations: [], members: [] });
  const [tab, setTab] = useState('orgs');
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/users/directory', { params: { orgLimit: 100, memberLimit: 100 } });
      setData(data || { organizations: [], members: [] });
    } catch {
      // silent — anonymous viewers still get an empty directory
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const list = tab === 'orgs' ? data.organizations : data.members;
  const isOrgs = tab === 'orgs';
  const strip = list.slice(0, STRIP_LIMIT);
  const overflow = Math.max(0, list.length - STRIP_LIMIT);

  return (
    <section className="bg-white rounded-2xl border-2 border-fursa-primary/20 p-md mb-lg">
      <header className="flex items-center justify-between mb-md gap-sm flex-wrap">
        <div>
          <h3 className="font-headline-sm font-bold" style={{ color: '#085041' }}>
            <span className="material-symbols-outlined align-middle text-[20px] mr-xs" style={{ color: PRIMARY }}>diversity_3</span>
            Connect & Follow
          </h3>
          <p className="text-label-sm text-on-surface-variant mt-[2px]">
            Follow organizations and members to see their posts and opportunities.
          </p>
        </div>
        <div className="flex bg-fursa-primary/5 rounded-full p-[2px]">
          <TabBtn active={isOrgs} onClick={() => setTab('orgs')} icon="apartment" label={`Organizations (${data.organizations.length})`} />
          <TabBtn active={!isOrgs} onClick={() => setTab('members')} icon="groups" label={`People (${data.members.length})`} />
        </div>
      </header>

      {loading ? (
        <div className="py-md text-center text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin" style={{ color: PRIMARY }}>refresh</span>
        </div>
      ) : list.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant py-sm">
          {isOrgs ? 'No organizations are visible right now.' : 'No members to suggest yet.'}
        </p>
      ) : (
        <>
          <div className="flex gap-md overflow-x-auto pb-xs no-scrollbar">
            {strip.map((u) => (
              <ConnectCard key={u._id} u={u} isOrg={isOrgs} onChanged={load} />
            ))}
            {overflow > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="shrink-0 w-56 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-xs hover:bg-fursa-primary/5 transition-colors"
                style={{ borderColor: PRIMARY, color: PRIMARY }}
              >
                <span className="material-symbols-outlined text-[28px]">grid_view</span>
                <span className="font-bold">See all {isOrgs ? 'organizations' : 'people'}</span>
                <span className="text-label-sm">+{overflow} more →</span>
              </button>
            )}
          </div>

          <div className="mt-sm flex justify-end">
            <button
              onClick={() => setShowAll(true)}
              className="text-label-sm font-bold hover:underline flex items-center gap-xs"
              style={{ color: PRIMARY }}
            >
              See all {list.length} {isOrgs ? 'organizations' : 'people'}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </>
      )}

      {showAll && (
        <SeeAllModal
          initialTab={tab}
          data={data}
          onClose={() => setShowAll(false)}
          onChanged={load}
        />
      )}
    </section>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-md py-1 rounded-full text-label-sm font-bold flex items-center gap-xs transition-colors ${
        active ? 'text-white shadow' : 'text-on-surface-variant'
      }`}
      style={active ? { backgroundColor: PRIMARY } : undefined}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

function ConnectCard({ u, isOrg, onChanged, fluid = false }) {
  const title = isOrg ? (u.organization || u.name) : u.name;
  const subtitle = isOrg
    ? (u.location || 'Partner organization')
    : (u.bio ? u.bio.slice(0, 60) + (u.bio.length > 60 ? '…' : '') : 'Member of the community');

  return (
    <article className={`${fluid ? 'w-full' : 'shrink-0 w-56'} bg-white border border-outline-variant rounded-xl p-md flex flex-col items-center text-center hover:shadow-md transition-shadow`}>
      <Link to={`/profile/${u._id}`} className="flex flex-col items-center">
        {u.avatar ? (
          <img
            src={u.avatar}
            alt=""
            loading="lazy"
            decoding="async"
            data-allow-loading="true"
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow" style={{ backgroundColor: PRIMARY }}>
            {title?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <h4 className="font-bold mt-sm line-clamp-1" style={{ color: '#085041' }}>{title}</h4>
        {isOrg && u.name !== title && (
          <p className="text-label-sm text-on-surface-variant line-clamp-1">{u.name}</p>
        )}
      </Link>
      <p className="text-label-sm text-on-surface-variant mt-xs line-clamp-2 min-h-[2.5em]">
        {subtitle}
      </p>
      <p className="text-label-sm mt-xs mb-sm" style={{ color: PRIMARY }}>
        <span className="font-bold">{u.followers}</span> {u.followers === 1 ? 'follower' : 'followers'}
      </p>
      <FollowButton
        targetId={u._id}
        targetName={title}
        onChange={() => onChanged?.()}
      />
    </article>
  );
}

function SeeAllModal({ initialTab, data, onClose, onChanged }) {
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const isOrgs = tab === 'orgs';
  const list = isOrgs ? data.organizations : data.members;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((u) => {
      const hay = [u.name, u.organization, u.location, u.bio, ...(u.tags || [])]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [list, q]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl w-full max-w-5xl my-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 bg-surface rounded-t-2xl border-b border-outline-variant px-lg py-md z-10">
          <div className="flex items-center justify-between gap-md flex-wrap">
            <div>
              <h2 className="font-headline-sm font-bold" style={{ color: '#085041' }}>
                <span className="material-symbols-outlined align-middle text-[22px] mr-xs" style={{ color: PRIMARY }}>diversity_3</span>
                Connect & Follow — full directory
              </h2>
              <p className="text-label-sm text-on-surface-variant mt-[2px]">
                Browse every organization and member you can follow.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface rounded-full p-xs"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mt-md flex items-center gap-md flex-wrap">
            <div className="flex bg-fursa-primary/5 rounded-full p-[2px]">
              <TabBtn active={isOrgs} onClick={() => setTab('orgs')} icon="apartment" label={`Organizations (${data.organizations.length})`} />
              <TabBtn active={!isOrgs} onClick={() => setTab('members')} icon="groups" label={`People (${data.members.length})`} />
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isOrgs ? 'Search organizations, location, focus…' : 'Search people, skills, location…'}
                className="w-full bg-surface-container-low border border-outline-variant pl-xl pr-md py-xs rounded-lg focus:outline-none focus:ring-2 text-body-sm"
                style={{ '--tw-ring-color': PRIMARY }}
              />
            </div>
            <span className="text-label-sm text-on-surface-variant">
              Showing <span className="font-bold">{filtered.length}</span> of {list.length}
            </span>
          </div>
        </header>

        <div className="p-lg">
          {filtered.length === 0 ? (
            <div className="text-center py-xl text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-sm" style={{ color: PRIMARY }}>search_off</span>
              <p>No matches. Try a different search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
              {filtered.map((u) => (
                <ConnectCard key={u._id} u={u} isOrg={isOrgs} onChanged={onChanged} fluid />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
