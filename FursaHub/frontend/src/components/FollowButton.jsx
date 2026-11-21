import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Renders a Follow / Following button for the given target user/organization id.
 *
 * Hidden when:
 *  - the viewer is not signed in
 *  - the viewer is the target themselves
 */
export default function FollowButton({ targetId, targetName, size = 'sm', onChange }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const viewerId = user?.id || user?._id;
  const isSelf = viewerId && String(viewerId) === String(targetId);
  const visible = !!viewerId && !!targetId && !isSelf;

  const load = useCallback(async () => {
    if (!visible) { setLoaded(true); return; }
    try {
      const { data } = await api.get(`/follows/status/${targetId}`);
      setFollowing(!!data.following);
    } catch {
      setFollowing(false);
    } finally {
      setLoaded(true);
    }
  }, [visible, targetId]);

  useEffect(() => { load(); }, [load]);

  if (!visible) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (following) {
        await api.delete(`/follows/${targetId}`);
        setFollowing(false);
        onChange?.(false);
      } else {
        await api.post(`/follows/${targetId}`);
        setFollowing(true);
        onChange?.(true);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  }

  const sizeCls = size === 'lg'
    ? 'px-lg py-sm text-body-md'
    : 'px-md py-1 text-label-sm';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || !loaded}
      title={following ? `Unfollow ${targetName || 'this account'}` : `Follow ${targetName || 'this account'}`}
      className={`${sizeCls} rounded-full font-bold border-2 transition-colors flex items-center gap-xs disabled:opacity-50 ${
        following
          ? 'bg-white text-[#059669] border-[#059669] hover:bg-red-50 hover:text-red-600 hover:border-red-300'
          : 'text-white border-transparent hover:opacity-90'
      }`}
      style={following ? undefined : { backgroundColor: '#059669' }}
    >
      <span className="material-symbols-outlined text-[16px]">
        {following ? 'check' : 'person_add'}
      </span>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
