import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Linkify } from '../lib/linkify';
import FollowButton from '../components/FollowButton';

const PRIMARY = '#059669';

/**
 * Facebook-style UserProfileView.
 *  - Cover banner + circular avatar overlay
 *  - Identity panel (name, role, bio, location, website)
 *  - Stats (followers / following / posts)
 *  - Tabs: students get About / Stories / Skills; admins get About / Opportunities / Followers
 *  - Bandwidth-safe images: lazy-loading, decoding="async", placeholder until in view
 */
export default function UserProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('about');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/${id}/profile`);
      setData(data);
      setTab(data.user.role === 'admin' ? 'opportunities' : 'stories');
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-xl flex justify-center">
        <span className="material-symbols-outlined animate-spin" style={{ color: PRIMARY }}>refresh</span>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-xl text-on-surface-variant">Profile unavailable.</div>;
  }

  const { user, counts, viewer: v, stories, opportunities } = data;
  const isOrg = user.role === 'admin';
  const isOwner = v.isOwner;

  const tabsForRole = isOrg
    ? [
        { value: 'about', label: 'About', icon: 'info' },
        { value: 'opportunities', label: 'Opportunities', icon: 'work', count: counts.opportunities },
        { value: 'stories', label: 'Updates', icon: 'article', count: counts.stories },
      ]
    : [
        { value: 'about', label: 'About', icon: 'info' },
        { value: 'stories', label: 'Posts', icon: 'auto_stories', count: counts.stories },
        { value: 'skills', label: 'Skills', icon: 'workspace_premium' },
      ];

  return (
    <div className="-mx-lg md:-mx-xl -my-lg md:-my-xl bg-background min-h-[calc(100vh-4rem)]">
      <CoverBanner url={user.coverBannerUrl} isOwner={isOwner} onUploaded={(url) => setData((d) => ({ ...d, user: { ...d.user, coverBannerUrl: url } }))} />

      <div className="max-w-5xl mx-auto px-lg">
        {/* Avatar overlaps the bottom of the banner; everything else sits clearly BELOW it. */}
        <div className="flex justify-center md:justify-start">
          <div className="-mt-14 md:-mt-16">
            <Avatar url={user.profilePictureUrl} name={user.name} isOwner={isOwner} onUploaded={(url) => setData((d) => ({ ...d, user: { ...d.user, profilePictureUrl: url } }))} />
          </div>
        </div>

        <div className="mt-md flex flex-col md:flex-row md:items-start md:justify-between gap-md">
          <div className="flex-1">
            <div className="flex items-center gap-sm flex-wrap">
              <h1
                className="font-headline-lg font-bold text-3xl md:text-4xl leading-tight tracking-tight"
                style={{ color: '#064E3B' }}
              >
                {user.name}
              </h1>
              {isOrg && (
                <span className="px-sm py-[2px] rounded-full text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: PRIMARY }}>
                  Organization
                </span>
              )}
              <span className="px-sm py-[2px] rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#E1F5EE', color: PRIMARY }}>
                @{(user.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'member'}
              </span>
            </div>
            <p className="text-body-md font-medium capitalize mt-xs" style={{ color: '#374151' }}>
              {isOrg ? (user.organization || 'Partner Organization') : (user.program || 'Youth Member')}
              {user.physicalLocation && ` · ${user.physicalLocation}`}
            </p>
            <Stats counts={counts} />
          </div>

          <div className="flex items-center gap-sm">
            {!isOwner && <FollowButton targetId={user._id} targetName={user.name} size="lg" onChange={() => load()} />}
            {isOwner && (
              <button
                onClick={() => setEditing(true)}
                className="px-lg py-sm rounded-full border-2 font-bold flex items-center gap-xs hover:bg-white transition-colors"
                style={{ borderColor: PRIMARY, color: PRIMARY }}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit profile
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-md py-sm rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-lg border-b-2 border-outline-variant flex overflow-x-auto no-scrollbar">
          {tabsForRole.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`relative px-lg py-sm font-bold flex items-center gap-xs whitespace-nowrap transition-colors ${
                  active ? '' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                style={active ? { color: PRIMARY } : undefined}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
                {typeof t.count === 'number' && (
                  <span className="text-label-sm bg-fursa-primary/10 px-xs rounded-full" style={{ color: PRIMARY }}>{t.count}</span>
                )}
                {active && <span className="absolute left-0 right-0 -bottom-[2px] h-[3px] rounded-t" style={{ backgroundColor: PRIMARY }} />}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="py-lg grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <aside className="lg:col-span-1 space-y-md">
            <AboutCard user={user} isOrg={isOrg} />
            {!isOrg && <SkillsCard tags={user.skillsTags} />}
          </aside>

          <section className="lg:col-span-2 space-y-md">
            {tab === 'about' && <AboutFull user={user} isOrg={isOrg} />}
            {tab === 'stories' && <StoriesTab stories={stories} owner={user} />}
            {tab === 'opportunities' && <OpportunitiesTab opportunities={opportunities} owner={user} />}
            {tab === 'skills' && <SkillsTab tags={user.skillsTags} />}
          </section>
        </div>
      </div>

      {editing && (
        <EditProfileModal user={user} onClose={() => setEditing(false)} onSaved={(u) => { setData((d) => ({ ...d, user: { ...d.user, ...u } })); setEditing(false); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function CoverBanner({ url, isOwner, onUploaded }) {
  const inputRef = useRef(null);
  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', 'cover_banner');
    try {
      const { data } = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = data.asset?.secureUrl || data.asset?.url;
      if (!newUrl) return;
      // Persist to user profile
      const me = JSON.parse(localStorage.getItem('fursahub_user') || '{}');
      const id = me.id || me._id;
      if (id) await api.patch(`/users/${id}`, { coverBannerUrl: newUrl });
      onUploaded?.(newUrl);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="relative h-40 md:h-56 w-full overflow-hidden" style={{ backgroundColor: '#0b3d33' }}>
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          data-allow-loading="true"
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #0b3d33 100%)` }} />
      )}
      {isOwner && (
        <>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute right-md bottom-md bg-white/90 hover:bg-white px-md py-xs rounded-full font-bold text-label-sm flex items-center gap-xs shadow"
            style={{ color: PRIMARY }}
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            Edit cover
          </button>
        </>
      )}
    </div>
  );
}

function Avatar({ url, name, isOwner, onUploaded }) {
  const inputRef = useRef(null);
  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', 'profile_picture');
    try {
      const { data } = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = data.asset?.secureUrl || data.asset?.url;
      if (!newUrl) return;
      const me = JSON.parse(localStorage.getItem('fursahub_user') || '{}');
      const id = me.id || me._id;
      if (id) await api.patch(`/users/${id}`, { profilePictureUrl: newUrl });
      onUploaded?.(newUrl);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  return (
    <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white bg-white shadow-md shrink-0">
      {url ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          decoding="async"
          data-allow-loading="true"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-4xl"
          style={{ backgroundColor: PRIMARY }}
        >
          {name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      {isOwner && (
        <>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
          <button
            onClick={() => inputRef.current?.click()}
            title="Update profile picture"
            className="absolute bottom-0 right-0 bg-white p-xs rounded-full border-2 shadow"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          </button>
        </>
      )}
    </div>
  );
}

function Stats({ counts }) {
  const items = [
    { label: 'Followers', value: counts.followers },
    { label: 'Following', value: counts.following },
    { label: 'Posts', value: counts.stories },
  ];
  return (
    <div className="flex items-center gap-lg mt-xs">
      {items.map((s) => (
        <div key={s.label} className="text-body-sm">
          <span className="font-bold" style={{ color: PRIMARY }}>{s.value}</span>{' '}
          <span className="text-on-surface-variant">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function AboutCard({ user, isOrg }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md">
      <h3 className="font-headline-sm mb-sm" style={{ color: '#085041' }}>Intro</h3>
      <p className="text-body-sm text-on-surface whitespace-pre-wrap mb-md">
        {user.profileBio || (isOrg
          ? 'This organization has not added a description yet.'
          : 'This member has not added a bio yet.')}
      </p>
      <ul className="space-y-xs text-body-sm">
        {user.physicalLocation && (
          <li className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            {user.physicalLocation}
          </li>
        )}
        {user.websiteUrl && (
          <li className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-[18px]" style={{ color: PRIMARY }}>link</span>
            <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: PRIMARY }}>
              {user.websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          </li>
        )}
        {user.joinedAt && (
          <li className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </li>
        )}
      </ul>
    </div>
  );
}

function SkillsCard({ tags }) {
  if (!tags?.length) return null;
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md">
      <h3 className="font-headline-sm mb-sm" style={{ color: '#085041' }}>Skills</h3>
      <div className="flex flex-wrap gap-xs">
        {tags.slice(0, 8).map((t) => (
          <span key={t} className="px-sm py-xs rounded-full text-label-sm font-bold" style={{ backgroundColor: '#E1F5EE', color: PRIMARY }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function AboutFull({ user, isOrg }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-lg">
      <h2 className="font-headline-sm mb-md" style={{ color: '#085041' }}>{isOrg ? 'About this organization' : 'About'}</h2>
      <p className="text-body-md whitespace-pre-wrap">
        {user.profileBio || 'Nothing here yet.'}
      </p>
      {user.skillsTags?.length > 0 && (
        <div className="mt-lg">
          <h3 className="font-bold text-label-md uppercase mb-sm text-on-surface-variant">{isOrg ? 'Focus areas' : 'Skills'}</h3>
          <div className="flex flex-wrap gap-xs">
            {user.skillsTags.map((t) => (
              <span key={t} className="px-sm py-xs rounded-full text-label-sm font-bold" style={{ backgroundColor: '#E1F5EE', color: PRIMARY }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsTab({ tags }) {
  if (!tags?.length) {
    return <Empty icon="workspace_premium" title="No skills listed yet" desc="Add skills from Edit Profile to showcase what you can do." />;
  }
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-lg">
      <h2 className="font-headline-sm mb-md" style={{ color: '#085041' }}>Skills & Endorsements</h2>
      <div className="flex flex-wrap gap-sm">
        {tags.map((t) => (
          <span key={t} className="px-md py-xs rounded-full font-bold border-2" style={{ borderColor: PRIMARY, color: PRIMARY, backgroundColor: '#E1F5EE' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StoriesTab({ stories, owner }) {
  if (!stories.length) {
    return <Empty icon="auto_stories" title="No posts yet" desc={`${owner.name} hasn't shared an inspiration post yet.`} />;
  }
  return (
    <div className="space-y-md">
      {stories.map((s) => (
        <article key={s._id} className="bg-surface border border-outline-variant rounded-xl p-md">
          <header className="flex items-center justify-between mb-sm">
            <h3 className="font-bold" style={{ color: '#085041' }}>{s.title}</h3>
            <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
              {s.visibility === 'followers' && (
                <span className="inline-flex items-center gap-[2px] px-xs rounded-full text-[10px] font-bold" style={{ backgroundColor: '#E1F5EE', color: PRIMARY }}>
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  Followers
                </span>
              )}
              <span>{new Date(s.createdAt).toLocaleDateString()}</span>
            </div>
          </header>
          <p className="text-body-sm whitespace-pre-wrap"><Linkify text={s.body} /></p>
          {s.mediaUrl && (
            <img src={s.mediaUrl} alt="" loading="lazy" decoding="async" data-allow-loading="true"
              className="mt-sm rounded-lg max-h-72 object-cover w-full border border-outline-variant" />
          )}
          <div className="mt-sm flex items-center gap-md text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[16px]">favorite</span>{s.likesCount}</span>
            <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[16px]">chat_bubble</span>{s.commentsCount}</span>
            <Link to="/inspire" className="ml-auto font-bold hover:underline" style={{ color: PRIMARY }}>Open in Inspire →</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function OpportunitiesTab({ opportunities, owner }) {
  if (!opportunities.length) {
    return <Empty icon="work" title="No opportunities yet" desc={`${owner.organization || owner.name} hasn't posted any opportunities yet.`} />;
  }
  return (
    <div className="space-y-md">
      {opportunities.map((o) => {
        const daysLeft = o.deadline ? Math.ceil((new Date(o.deadline) - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return (
          <article key={o._id} className="bg-surface border border-outline-variant rounded-xl p-md">
            <header className="flex items-center gap-sm flex-wrap mb-sm">
              <span className="px-2 py-[2px] text-white text-[10px] font-bold uppercase rounded-full" style={{ backgroundColor: PRIMARY }}>{o.type}</span>
              {o.visibility === 'followers' && (
                <span className="inline-flex items-center gap-[2px] px-xs rounded-full text-[10px] font-bold" style={{ backgroundColor: '#E1F5EE', color: PRIMARY }}>
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  Followers
                </span>
              )}
              {daysLeft != null && daysLeft >= 0 && (
                <span className="px-2 py-[2px] rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                  Ends in {daysLeft}d
                </span>
              )}
              <span className="ml-auto text-label-sm text-on-surface-variant">{new Date(o.createdAt).toLocaleDateString()}</span>
            </header>
            <h3 className="font-bold mb-xs" style={{ color: '#085041' }}>{o.title}</h3>
            <p className="text-body-sm text-on-surface-variant line-clamp-3 whitespace-pre-wrap"><Linkify text={o.description} /></p>
            <div className="mt-sm flex items-center justify-between">
              <span className="text-label-sm text-on-surface-variant">{o.location || (o.remote ? 'Remote' : '')}</span>
              <Link to="/explore" className="font-bold text-label-sm hover:underline" style={{ color: PRIMARY }}>Open in Explore →</Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Empty({ icon, title, desc }) {
  return (
    <div className="bg-surface border-2 border-dashed border-outline-variant rounded-xl p-xl text-center">
      <span className="material-symbols-outlined text-4xl mb-sm" style={{ color: PRIMARY }}>{icon}</span>
      <h4 className="font-headline-sm" style={{ color: '#085041' }}>{title}</h4>
      <p className="text-body-sm text-on-surface-variant mt-xs">{desc}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Profile modal                                                 */
/* ------------------------------------------------------------------ */

function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    profileBio: user.profileBio || '',
    physicalLocation: user.physicalLocation || '',
    websiteUrl: user.websiteUrl || '',
    skillsTags: (user.skillsTags || []).join(', '),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true); setError('');
    try {
      const payload = {
        profileBio: form.profileBio,
        physicalLocation: form.physicalLocation,
        websiteUrl: form.websiteUrl,
        skillsTags: form.skillsTags.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const { data } = await api.patch(`/users/${user._id}`, payload);
      onSaved?.(data.user || payload);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-md" onClick={onClose}>
      <div className="bg-surface rounded-xl w-full max-w-lg p-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-headline-sm" style={{ color: '#085041' }}>Edit profile</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="space-y-md">
          <div>
            <label className="block font-label-sm text-outline mb-xs uppercase">Bio (max 250)</label>
            <textarea
              rows={3}
              maxLength={250}
              value={form.profileBio}
              onChange={(e) => setForm((p) => ({ ...p, profileBio: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg p-sm bg-background outline-none focus:ring-2 resize-y"
              style={{ '--tw-ring-color': PRIMARY }}
            />
            <p className="text-label-sm text-outline mt-xs">{form.profileBio.length}/250</p>
          </div>
          <div>
            <label className="block font-label-sm text-outline mb-xs uppercase">Location</label>
            <input
              type="text"
              value={form.physicalLocation}
              onChange={(e) => setForm((p) => ({ ...p, physicalLocation: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg p-sm bg-background outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block font-label-sm text-outline mb-xs uppercase">Website</label>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
              placeholder="https://…"
              className="w-full border border-outline-variant rounded-lg p-sm bg-background outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block font-label-sm text-outline mb-xs uppercase">
              {user.role === 'admin' ? 'Focus areas (comma-separated)' : 'Skills (comma-separated)'}
            </label>
            <input
              type="text"
              value={form.skillsTags}
              onChange={(e) => setForm((p) => ({ ...p, skillsTags: e.target.value }))}
              placeholder="React, Tailoring, Solar"
              className="w-full border border-outline-variant rounded-lg p-sm bg-background outline-none focus:ring-2"
            />
          </div>

          {error && <p className="text-red-600 text-body-sm">{error}</p>}

          <div className="flex justify-end gap-sm pt-sm">
            <button onClick={onClose} className="px-md py-sm rounded-lg border border-outline-variant">Cancel</button>
            <button
              onClick={save}
              disabled={busy}
              className="px-lg py-sm rounded-lg text-white font-bold disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
