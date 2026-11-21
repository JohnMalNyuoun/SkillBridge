import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Linkify } from '../lib/linkify';
import FollowButton from '../components/FollowButton';
import VisibilityPicker from '../components/VisibilityPicker';

export default function Inspire() {
  const { user } = useAuth();
  const { setRightRail } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(null);

  // Open the composer automatically when reached via the FAB (?compose=1)
  // and clean the URL so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      setShowForm(true);
      const next = new URLSearchParams(searchParams);
      next.delete('compose');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/stories', { params: { limit: 50, _ts: Date.now() } });
      setStories(data.items || []);
      setRefreshedAt(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onFocus() { load({ silent: true }); }
    function onVisible() { if (document.visibilityState === 'visible') load({ silent: true }); }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function toggleLike(story) {
    try {
      const { data } = await api.post(`/stories/${story._id}/like`);
      setStories((prev) =>
        prev.map((s) =>
          s._id === story._id
            ? { ...s, likedByMe: data.likedByMe, likesCount: data.likesCount }
            : s
        )
      );
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  async function addComment(story, body) {
    const { data } = await api.post(`/stories/${story._id}/comments`, { body });
    setStories((prev) =>
      prev.map((s) =>
        s._id === story._id
          ? {
              ...s,
              comments: [...(s.comments || []), data.comment],
              commentsCount: data.commentsCount,
            }
          : s
      )
    );
  }

  async function removeComment(story, commentId) {
    const { data } = await api.delete(`/stories/${story._id}/comments/${commentId}`);
    setStories((prev) =>
      prev.map((s) =>
        s._id === story._id
          ? {
              ...s,
              comments: (s.comments || []).filter((c) => c._id !== commentId),
              commentsCount: data.commentsCount,
            }
          : s
      )
    );
  }

  async function removeStory(story) {
    if (!confirm('Remove this story?')) return;
    try {
      await api.delete(`/stories/${story._id}`);
      setStories((prev) => prev.filter((s) => s._id !== story._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  }

  useEffect(() => {
    if (typeof setRightRail !== 'function') return undefined;
    setRightRail(<FeedRightRail stories={stories} />);
    return () => setRightRail(null);
  }, [setRightRail, stories]);

  return (
    <div className="-mx-lg md:-mx-xl -my-lg md:-my-xl min-h-[calc(100vh-4rem)]">
      {/* Sticky "Home" header */}
      <div className="sticky top-16 z-30 bg-surface/80 backdrop-blur-md p-md border-b border-outline-variant flex items-center justify-between">
        <h2 className="font-headline-sm text-headline-sm">Inspire</h2>
        <button
          onClick={() => load()}
          disabled={loading}
          title={refreshedAt ? `Last updated ${refreshedAt.toLocaleTimeString()}` : 'Refresh'}
          className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
          aria-label="Refresh feed"
        >
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {/* Inline composer trigger (Twitter-style) */}
      <div className="p-md border-b border-outline-variant flex gap-md">
        <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          {!showForm ? (
            <>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full text-left bg-transparent border-none text-body-lg text-on-surface-variant py-sm"
              >
                What's happening?
              </button>
              <div className="flex justify-between items-center mt-sm pt-sm border-t border-outline-variant/30">
                <div className="flex gap-sm text-secondary">
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="material-symbols-outlined cursor-pointer hover:bg-secondary/10 p-xs rounded-full"
                    title="Add image"
                  >image</button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="material-symbols-outlined cursor-pointer hover:bg-secondary/10 p-xs rounded-full"
                    title="Add tags"
                  >tag</button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="material-symbols-outlined cursor-pointer hover:bg-secondary/10 p-xs rounded-full"
                    title="Visibility"
                  >visibility</button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="bg-secondary text-on-secondary px-lg py-sm rounded-full font-bold hover:brightness-110 transition-all"
                >
                  Post
                </button>
              </div>
            </>
          ) : (
            <StoryComposer
              onCancel={() => setShowForm(false)}
              onCreated={(story) => {
                setStories((prev) => [story, ...prev]);
                setShowForm(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Feed */}
      <div>
        {loading && (
          <div className="py-xl flex justify-center">
            <span className="material-symbols-outlined animate-spin text-secondary">refresh</span>
          </div>
        )}

        {!loading && stories.length === 0 && (
          <div className="p-xl text-center">
            <span className="material-symbols-outlined text-4xl mb-md text-secondary">auto_stories</span>
            <h4 className="font-headline-sm">No stories yet</h4>
            <p className="text-body-sm text-on-surface-variant mt-sm">
              Be the first to share. Your update could be the spark someone else needs.
            </p>
          </div>
        )}

        {stories.map((s) => {
          const canDelete =
            user &&
            (user.id === s.author?._id || user._id === s.author?._id || user.role === 'admin');
          const authorHandle =
            (s.author?.name || 'member').toString().toLowerCase().replace(/\s+/g, '_');
          return (
            <article
              key={s._id}
              className="p-md border-b border-outline-variant hover:bg-surface-container-low/30 transition-colors"
            >
              <div className="flex gap-md">
                <Link
                  to={s.author?._id ? `/profile/${s.author._id}` : '#'}
                  className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold flex-shrink-0 hover:opacity-90"
                >
                  {s.author?.name?.[0]?.toUpperCase() || '?'}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-sm">
                    <div className="flex items-center gap-xs flex-wrap min-w-0">
                      <Link
                        to={s.author?._id ? `/profile/${s.author._id}` : '#'}
                        className="font-bold text-on-surface hover:underline truncate"
                      >
                        {s.author?.name || 'Member'}
                      </Link>
                      {s.author?.role === 'admin' && (
                        <span
                          className="material-symbols-outlined text-secondary text-sm"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          title="Organization"
                        >
                          verified
                        </span>
                      )}
                      <span className="text-on-surface-variant text-sm truncate">
                        @{authorHandle} · {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      {s.visibility === 'followers' && (
                        <span className="inline-flex items-center gap-[2px] px-xs rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          Followers
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-xs shrink-0">
                      <FollowButton targetId={s.author?._id} targetName={s.author?.name} />
                      {canDelete && (
                        <button
                          onClick={() => removeStory(s)}
                          title="Remove"
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {s.title && (
                    <h3 className="mt-xs font-bold text-on-surface text-body-lg">{s.title}</h3>
                  )}
                  <p className="mt-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    <Linkify text={s.body} />
                  </p>

                  {s.mediaUrl && (
                    <div className="mt-md rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low">
                      <img
                        src={s.mediaUrl}
                        alt=""
                        className="w-full max-h-96 object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {s.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-xs mt-md">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="px-sm py-xs rounded-full text-label-sm bg-secondary/10 text-secondary"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="flex justify-between mt-md text-on-surface-variant max-w-md">
                    <button
                      type="button"
                      className="flex items-center gap-xs hover:text-primary transition-colors group"
                      title="Comments"
                    >
                      <span className="material-symbols-outlined text-sm group-hover:bg-primary/10 p-xs rounded-full">chat_bubble</span>
                      <span className="text-xs">{s.commentsCount || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLike(s)}
                      className={`flex items-center gap-xs transition-colors group ${s.likedByMe ? 'text-error' : 'hover:text-error'}`}
                      title="Like"
                    >
                      <span
                        className="material-symbols-outlined text-sm group-hover:bg-error/10 p-xs rounded-full"
                        style={s.likedByMe ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        favorite
                      </span>
                      <span className="text-xs">{s.likesCount || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = `${window.location.origin}/inspire#${s._id}`;
                        try {
                          if (navigator.share) {
                            await navigator.share({ title: s.title || 'Fursahub story', url });
                          } else {
                            await navigator.clipboard.writeText(url);
                            alert('Link copied');
                          }
                        } catch { /* user dismissed */ }
                      }}
                      className="flex items-center gap-xs hover:text-primary transition-colors group"
                      title="Share"
                    >
                      <span className="material-symbols-outlined text-sm group-hover:bg-primary/10 p-xs rounded-full">share</span>
                    </button>
                  </div>

                  <CommentSection
                    story={s}
                    currentUser={user}
                    onAdd={(body) => addComment(s, body)}
                    onRemove={(commentId) => removeComment(s, commentId)}
                  />
                </div>
              </div>
            </article>
          );
        })}

        <div className="text-center p-lg">
          <Link to="/explore" className="font-bold text-secondary hover:underline">← Back to Explore</Link>
        </div>
      </div>
    </div>
  );
}

function FeedRightRail({ stories }) {
  // Derive simple "trending" tags from currently-loaded stories so the rail
  // reflects real content instead of inventing API calls.
  const tagCounts = (stories || []).reduce((acc, s) => {
    (s.tags || []).forEach((t) => { acc[t] = (acc[t] || 0) + 1; });
    return acc;
  }, {});
  const trending = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Suggested authors: unique story authors (excluding current viewer is handled by FollowButton).
  const seen = new Set();
  const suggestions = [];
  for (const s of stories || []) {
    const a = s.author;
    if (!a?._id || seen.has(a._id)) continue;
    seen.add(a._id);
    suggestions.push(a);
    if (suggestions.length >= 3) break;
  }

  return (
    <>
      <div className="bg-surface-container-low rounded-xl p-md">
        <h3 className="font-headline-sm text-headline-sm mb-md">What's happening</h3>
        <div className="space-y-md">
          {trending.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No trends yet — be the first to post.</p>
          ) : (
            trending.map(([tag, count]) => (
              <div
                key={tag}
                className="cursor-pointer hover:bg-surface-container-high p-sm rounded-lg transition-colors"
              >
                <p className="text-xs text-on-surface-variant">Trending</p>
                <p className="font-bold">#{tag}</p>
                <p className="text-xs text-on-surface-variant">{count} post{count === 1 ? '' : 's'}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-md">
        <h3 className="font-headline-sm text-headline-sm mb-md">Who to follow</h3>
        <div className="space-y-md">
          {suggestions.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Suggestions will appear as people post.</p>
          ) : (
            suggestions.map((a) => {
              const handle = (a.name || 'member').toString().toLowerCase().replace(/\s+/g, '_');
              return (
                <div key={a._id} className="flex items-center justify-between gap-sm">
                  <Link to={`/profile/${a._id}`} className="flex items-center gap-sm min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold shrink-0">
                      {a.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{a.name || 'Member'}</p>
                      <p className="text-xs text-on-surface-variant truncate">@{handle}</p>
                    </div>
                  </Link>
                  <FollowButton targetId={a._id} targetName={a.name} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function CommentSection({ story, currentUser, onAdd, onRemove }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const comments = story.comments || [];

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onAdd(text.trim());
      setText('');
      setOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(c) {
    if (!confirm('Remove this comment?')) return;
    try {
      await onRemove(c._id);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  }

  const visible = open ? comments : comments.slice(-2);

  return (
    <div className="mt-md pt-md border-t border-outline-variant space-y-md">
      {comments.length > 2 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-label-sm font-bold hover:underline"
          style={{ color: '#1D9E75' }}
        >
          {open ? 'Hide comments' : `View all ${comments.length} comments`}
        </button>
      )}

      {visible.map((c) => {
        const canDelete =
          currentUser &&
          (currentUser.id === c.author?._id ||
            currentUser._id === c.author?._id ||
            currentUser.id === story.author?._id ||
            currentUser._id === story.author?._id ||
            currentUser.role === 'admin');
        return (
          <div key={c._id} className="flex gap-sm items-start">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-label-sm shrink-0"
              style={{ backgroundColor: '#1D9E75' }}
            >
              {c.author?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 bg-background rounded-lg p-sm border border-outline-variant">
              <div className="flex items-center justify-between mb-xs">
                <p className="text-label-sm font-bold" style={{ color: '#085041' }}>
                  {c.author?.name || 'Member'}
                  <span className="ml-sm font-normal text-outline">
                    · {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </p>
                {canDelete && (
                  <button
                    onClick={() => handleRemove(c)}
                    title="Delete"
                    className="text-on-surface-variant hover:text-red-600"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
              <p className="text-body-sm text-on-surface whitespace-pre-wrap"><Linkify text={c.body} /></p>
            </div>
          </div>
        );
      })}

      <form onSubmit={submit} className="flex gap-sm">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Add a comment…"
          className="flex-1 border border-outline-variant rounded-full px-md py-sm bg-surface outline-none focus:ring-2 focus:ring-secondary text-body-sm"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="px-md py-sm rounded-full bg-secondary text-on-secondary font-bold text-label-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {busy ? '…' : 'Post'}
        </button>
      </form>
    </div>
  );
}

function StoryComposer({ onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState(''); // must be explicitly selected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) {
      setError('Title and story are required.');
      return;
    }
    if (!visibility) {
      setError('Please choose who can see this post: Public or Followers Only.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/stories', {
        title: title.trim(),
        body: body.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        visibility,
      });
      setTitle(''); setBody(''); setMediaUrl(''); setTags(''); setVisibility('');
      onCreated?.(data.story);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface-container-low border border-outline-variant rounded-xl p-md space-y-md">
      <div>
        <label className="block font-label-sm text-outline mb-xs uppercase">Title</label>
        <input
          type="text"
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g. From learner to freelance designer"
          className="w-full border border-outline-variant rounded-lg p-sm bg-surface outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      <div>
        <label className="block font-label-sm text-outline mb-xs uppercase">Your story</label>
        <textarea
          rows={6}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you learn, build, or overcome? What advice would you give a learner just starting out?"
          className="w-full border border-outline-variant rounded-lg p-sm bg-surface outline-none focus:ring-2 focus:ring-secondary resize-y"
        />
        <p className="text-label-sm text-outline mt-xs">{body.length}/5000</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div>
          <label className="block font-label-sm text-outline mb-xs uppercase">Image URL (optional)</label>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border border-outline-variant rounded-lg p-sm bg-surface outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
        <div>
          <label className="block font-label-sm text-outline mb-xs uppercase">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, freelance, kakuma"
            className="w-full border border-outline-variant rounded-lg p-sm bg-surface outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      {error && <p className="text-error text-body-sm">{error}</p>}

      <VisibilityPicker
        value={visibility}
        onChange={setVisibility}
      />

      <div className="flex justify-end gap-sm">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-sm px-lg rounded-full font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="bg-secondary text-on-secondary py-sm px-xl rounded-full font-bold hover:brightness-110 transition-all disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Share Story'}
        </button>
      </div>
    </form>
  );
}
