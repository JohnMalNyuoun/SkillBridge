import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useNotifications } from '../../context/NotificationContext';

const Icon = ({ name, active = false, size = 24 }) => {
  const fill = active ? 'currentColor' : 'none';
  const strokeWidth = active ? 2 : 1.8;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4V14h-5v7.5h-4A1.5 1.5 0 0 1 5 20Z" fill={fill} />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21Z" fill={fill} />
          <path d="M4 5.5V21" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" fill={fill} />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="M9 11h6M9 15h4" stroke={active ? 'var(--text-on-primary)' : 'currentColor'} />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2.5h-15Z" fill={fill} />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill={fill} />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" fill={fill} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" fill={fill} />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" fill={fill} />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" fill={fill} />
          <path d="M2.5 20c.5-3.5 3.3-5.5 6.5-5.5s6 2 6.5 5.5" fill={fill} />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 14.5c2.6 0 4.5 1.6 5 4" />
        </svg>
      );
    case 'trending':
      return (
        <svg {...common}>
          <path d="M3 17 9 11l4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      );
    case 'building':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" fill={fill} />
          <path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2" stroke={active ? 'var(--text-on-primary)' : 'currentColor'} />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" fill={fill} />
          <path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7" fill={fill} />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l-5-5 5-5" />
          <path d="M5 12h11" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" fill={fill} />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V19a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V5a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    default:
      return null;
  }
};

const Navbar = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const triggerRouteRefresh = (path) => {
    navigate(path, {
      replace: true,
      state: { __refreshNonce: Date.now() }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (e, path) => {
    if (location.pathname === path) {
      e.preventDefault();
      triggerRouteRefresh(path);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    triggerRouteRefresh(location.pathname);
  };

  const getMenuPath = () => {
    if (user?.role === 'organisation') return '/org/settings';
    if (user?.role === 'admin') return '/admin/settings';
    return '/settings';
  };

  const youthLinks = [
    { label: t('nav.home'),         path: '/home',          icon: 'home' },
    { label: t('nav.courses'),      path: '/courses',       icon: 'book' },
    { label: t('nav.notifications'), path: '/notifications', icon: 'bell' }
  ];

  const orgLinks = [
    { label: t('nav.dashboard'),    path: '/org/dashboard',    icon: 'grid' },
    { label: t('nav.courses'),      path: '/org/courses',      icon: 'book' },
    { label: t('nav.applications'),   path: '/org/applications', icon: 'users' },
    { label: t('nav.notifications'), path: '/org/notifications', icon: 'bell' },
    { label: t('profile.helpSupport'),       path: '/org/impact',       icon: 'trending' }
  ];

  const adminLinks = [
    { label: t('nav.dashboard'), path: '/admin/dashboard',     icon: 'grid' },
    { label: t('nav.profile'),      path: '/admin/organisations', icon: 'building' },
    { label: t('nav.courses'),   path: '/admin/courses',       icon: 'book' },
    { label: 'Updates',          path: '/admin/updates',       icon: 'bell' },
    { label: t('nav.notifications'), path: '/admin/notifications', icon: 'bell' }
  ];

  const links = user?.role === 'organisation'
    ? orgLinks
    : user?.role === 'admin'
    ? adminLinks
    : youthLinks;

  const homePath =
    user?.role === 'organisation' ? '/org/dashboard' :
    user?.role === 'admin' ? '/admin/dashboard' : '/home';

  const isActive = (path) => location.pathname === path;

  const currentLabel =
    links.find(l => l.path === location.pathname)?.label || '';

  const leftLinks = links.slice(0, Math.ceil(links.length / 2));
  const rightLinks = links.slice(Math.ceil(links.length / 2));

  return (
    <>
      {/* Desktop top navbar */}
      <nav
        className="fh-desktop-only"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 32px',
          height: '64px',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Logo */}
        <Link
          to={homePath}
          onClick={(e) => handleNavClick(e, homePath)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'var(--fb-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-on-primary)',
            fontWeight: 900,
            fontSize: '0.95rem',
            letterSpacing: '-0.5px',
            boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)'
          }}>
            F
          </div>
          <span style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: 'var(--fb-blue)',
            letterSpacing: '-0.5px'
          }}>
            FursaHub
          </span>
        </Link>

        {/* Center pill nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-card)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          {leftLinks.map(link => {
            const active = isActive(link.path);
            const isNotificationsLink = link.path === '/notifications' || link.path === '/admin/notifications';
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: active ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--fb-blue)' : 'transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 8px rgba(24, 119, 242, 0.3)' : 'none'
                }}
              >
                <Icon name={link.icon} active={active} size={18} />
                {link.label}
                {isNotificationsLink && unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 6px',
                      borderRadius: '999px',
                      background: 'var(--danger-primary)',
                      color: 'var(--text-on-primary)',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      lineHeight: '18px',
                      textAlign: 'center'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh page"
            aria-label="Refresh page"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              color: 'var(--fb-blue)',
              background: 'var(--fb-blue-subtle)',
              border: '1px solid var(--fb-blue)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(24, 119, 242, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(24, 119, 242, 0.12)';
            }}
          >
            <Icon name="refresh" size={16} />
          </button>

          {rightLinks.map(link => {
            const active = isActive(link.path);
            const isNotificationsLink = link.path === '/notifications' || link.path === '/admin/notifications';
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={(e) => handleNavClick(e, link.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: active ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--fb-blue)' : 'transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 2px 8px rgba(24, 119, 242, 0.3)' : 'none'
                }}
              >
                <Icon name={link.icon} active={active} size={18} />
                {link.label}
                {isNotificationsLink && unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 6px',
                      borderRadius: '999px',
                      background: 'var(--danger-primary)',
                      color: 'var(--text-on-primary)',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      lineHeight: '18px',
                      textAlign: 'center'
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {(user?.role === 'youth' || user?.role === 'organisation' || user?.role === 'admin') && (
            <button
              onClick={() => navigate(getMenuPath())}
              title="Menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--fb-blue)',
                color: 'var(--fb-blue)',
                background: 'var(--fb-blue-subtle)',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                cursor: 'pointer'
              }}
            >
              <Icon name="menu" size={16} />
            </button>
          )}

        </div>
      </nav>

      {/* Mobile top bar */}
      <nav
        className="fh-mobile-only"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 16px',
          height: '56px',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <Link
          to={homePath}
          onClick={(e) => handleNavClick(e, homePath)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'var(--fb-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-on-primary)',
            fontWeight: 900,
            fontSize: '0.88rem',
            boxShadow: '0 2px 6px rgba(24, 119, 242, 0.3)'
          }}>
            F
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{
              fontSize: '1.05rem',
              fontWeight: 900,
              color: 'var(--fb-blue)',
              letterSpacing: '-0.5px'
            }}>
              FursaHub
            </span>
            {currentLabel && (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--fb-blue)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '2px'
              }}>
                {currentLabel}
              </span>
            )}
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(user?.role === 'youth' || user?.role === 'organisation' || user?.role === 'admin') && (
            <button
              onClick={() => navigate(getMenuPath())}
              aria-label="Menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                color: 'var(--fb-blue)',
                border: 'none',
                padding: '8px',
                minHeight: '44px',
                minWidth: '44px',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
            >
              <Icon name="menu" size={20} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav
        className="fh-mobile-only"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
          borderTop: '1px solid var(--border-color)',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--bottom-nav-height)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
          zIndex: 1000,
          alignItems: 'stretch',
          justifyContent: 'space-around',
          boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.3)'
        }}
      >
        {links.map(link => {
          const active = isActive(link.path);
          const isNotificationsLink = link.path === '/notifications' || link.path === '/admin/notifications';
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                minWidth: '44px',
                padding: '6px 4px',
                color: active ? 'var(--fb-blue)' : 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                background: active ? 'rgba(24, 119, 242, 0.15)' : 'transparent',
                transition: 'background 0.2s ease'
              }}>
                <div style={{ position: 'relative', width: '22px', height: '22px' }}>
                  <Icon name={link.icon} active={active} size={22} />
                  {isNotificationsLink && unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-7px',
                        right: '-10px',
                        minWidth: '16px',
                        height: '16px',
                        padding: '0 4px',
                        borderRadius: '999px',
                        background: 'var(--danger-primary)',
                        color: 'var(--text-on-primary)',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        lineHeight: '16px',
                        textAlign: 'center'
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: active ? 800 : 600,
                letterSpacing: '0.02em'
              }}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
