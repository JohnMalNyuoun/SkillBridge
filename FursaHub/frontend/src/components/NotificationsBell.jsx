import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ICONS = {
  story_like: 'favorite',
  story_comment: 'chat_bubble',
  opportunity_published: 'campaign',
  application_status: 'task_alt',
  system: 'notifications',
};

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 20 } });
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // silent — user might not be authed yet
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function openPanel() {
    setOpen((v) => !v);
  }

  async function handleClick(n) {
    try {
      if (!n.readAt) {
        await api.patch(`/notifications/${n._id}/read`);
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
        setUnread((c) => Math.max(0, c - 1));
      }
      setOpen(false);
      if (n.link) navigate(n.link);
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={openPanel}
        className="text-on-surface-variant hover:text-primary transition-colors relative"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-sm w-80 bg-surface border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant">
            <h4 className="font-label-md font-bold text-on-surface">Notifications</h4>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-label-sm font-bold hover:underline" style={{ color: '#1D9E75' }}>
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-lg text-center text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-xs block" style={{ color: '#1D9E75' }}>notifications_off</span>
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-md py-sm border-b border-outline-variant hover:bg-surface-container-low transition-colors flex gap-sm ${
                    !n.readAt ? 'bg-primary-container/5' : ''
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px] mt-xs shrink-0"
                    style={{ color: n.readAt ? '#9ca3af' : '#085041' }}
                  >
                    {ICONS[n.type] || 'notifications'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-body-sm ${!n.readAt ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>
                      {n.message}
                    </p>
                    <p className="text-label-sm text-outline mt-xs">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.readAt && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
