import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import NotificationsBell from './NotificationsBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useT } from '../context/LanguageContext';

export default function TopNav({ searchPlaceholder }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const initial = user?.name?.[0]?.toUpperCase() || 'U';
  const placeholder = searchPlaceholder ?? t('action.search');
  const profilePath = user ? `/profile/${user.id || user._id}` : '/login';

  return (
    <header className="flex justify-between items-center h-16 px-lg bg-surface/90 backdrop-blur-md border-b border-outline-variant top-0 sticky z-40">
      <div className="flex items-center gap-md flex-1 min-w-0">
        <Link
          to="/"
          className="flex items-center gap-sm mr-lg md:hidden text-headline-sm font-headline-sm font-bold text-primary"
        >
          Fursahub
        </Link>
        <div className="hidden md:flex items-center bg-surface-container-low px-md py-xs rounded-full border border-outline-variant focus-within:ring-2 focus-within:ring-primary">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
          <input
            type="text"
            placeholder={placeholder}
            className="bg-transparent border-none focus:ring-0 outline-none text-sm w-64 ml-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-lg">
        <div className="flex gap-md items-center text-on-surface-variant">
          <LanguageSwitcher />
          <NotificationsBell />
          <button
            onClick={() => navigate('/settings')}
            className="hover:text-primary cursor-pointer transition-colors"
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
        <button
          onClick={() => navigate(profilePath)}
          title={t('action.viewProfile')}
          className="flex items-center gap-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm overflow-hidden border border-outline-variant">
            {initial}
          </div>
          <span className="hidden sm:block font-label-md text-label-md group-hover:text-primary transition-colors max-w-[120px] truncate">
            {user?.name || ''}
          </span>
        </button>
      </div>
    </header>
  );
}
