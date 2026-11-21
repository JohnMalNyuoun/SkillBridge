import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';

const navBase =
  'flex items-center gap-md px-md py-sm rounded-full transition-colors cursor-pointer active:scale-95 duration-150';
const navIdle = 'text-on-surface-variant hover:bg-surface-container-high';
const navActive = 'text-primary font-bold bg-primary-container/15';

function Item({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `${navBase} ${isActive ? navActive : navIdle}`}>
      {({ isActive }) => (
        <>
          <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>{icon}</span>
          <span className="font-label-md text-label-md">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidenav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const isAdmin = user?.role === 'admin';
  const myProfilePath = user ? `/profile/${user.id || user._id}` : '/login';

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface border-r border-outline-variant py-md px-sm z-50">
      <div className="mb-xl px-md">
        <h1 className="text-headline-sm font-headline-sm font-bold text-primary">Fursahub</h1>
        <p className="text-label-sm text-on-surface-variant">{t('app.tagline')}</p>
      </div>

      <nav className="flex-1 space-y-xs">
        {isAdmin ? (
          <>
            <Item to="/dashboard" icon="dashboard" label={t('nav.dashboard')} end />
            <Item to="/explore" icon="explore" label={t('nav.opportunities')} />
            <Item to="/inspire" icon="auto_stories" label={t('nav.inspire')} />
            <Item to="/beneficiaries" icon="groups" label={t('nav.beneficiaries')} />
            <Item to={myProfilePath} icon="badge" label={t('nav.myOrgPage')} />
            <Item to="/settings" icon="settings" label={t('nav.settings')} />
          </>
        ) : (
          <>
            <Item to="/explore" icon="explore" label={t('nav.exploreCourses')} />
            <Item to="/journey" icon="school" label={t('nav.myLearning')} end />
            <Item to="/inspire" icon="auto_stories" label={t('nav.inspire')} />
            <Item to={myProfilePath} icon="account_circle" label={t('nav.myProfile')} />
            <Item to="/settings" icon="settings" label={t('nav.settings')} />
          </>
        )}
      </nav>

      <div className="mt-auto px-md pb-md space-y-sm">
        {user && (
          <div className="flex items-center gap-sm p-sm rounded-lg bg-surface-container-low">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-label-sm font-bold truncate">{user.name}</div>
              <div className="text-label-sm text-on-surface-variant capitalize">{user.role}</div>
            </div>
          </div>
        )}
        {isAdmin ? (
          <button
            onClick={() => navigate('/opportunities/new')}
            className="w-full bg-secondary text-on-secondary py-sm px-md rounded-full font-bold text-label-md hover:brightness-110 transition-all flex items-center justify-center gap-sm shadow-md shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('action.postOpportunity')}
          </button>
        ) : (
          <button
            onClick={() => navigate('/explore')}
            className="w-full bg-secondary text-on-secondary py-sm px-md rounded-full font-bold text-label-md hover:brightness-110 transition-all flex items-center justify-center gap-sm shadow-md shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t('action.enrollNow')}
          </button>
        )}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full text-on-surface-variant py-xs px-md rounded-lg text-label-sm hover:bg-surface-container-high transition-colors"
        >
          {t('action.signOut')}
        </button>
      </div>
    </aside>
  );
}
