import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseLink =
  'flex flex-col items-center justify-center gap-1 transition-colors';
const idle = 'text-on-surface-variant hover:text-primary';
const active = 'text-primary';

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${baseLink} ${isActive ? active : idle}`}
    >
      {({ isActive }) => (
        <>
          <span
            className="material-symbols-outlined"
            style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {icon}
          </span>
          <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const profilePath = user ? `/profile/${user.id || user._id}` : '/login';
  const homePath = isAdmin ? '/dashboard' : '/journey';
  // FAB is dedicated to creating a post — nothing else.
  const fabAction = () => navigate('/inspire?compose=1');

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-outline-variant flex items-center justify-around px-md z-50 md:hidden">
      <NavItem to={homePath} icon="home" label="Home" end />
      <NavItem to="/explore" icon="explore" label="Explore" />

      <button
        type="button"
        onClick={fabAction}
        aria-label="Create a post"
        title="Create a post"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-lg shadow-secondary/30 transform -translate-y-4 border-4 border-surface active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <NavItem to="/inspire" icon="auto_stories" label="Inspire" />
      <NavItem to={profilePath} icon="person" label="Profile" />
    </nav>
  );
}
