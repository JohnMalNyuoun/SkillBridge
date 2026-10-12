const Button = ({
  children,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  style = {},
  ...props
}) => {
  const base = {
    fontFamily: 'inherit',
    fontWeight: 700,
    borderRadius: '10px',
    transition: 'all 0.15s ease',
    letterSpacing: '0.01em',
    minHeight: '44px',
    width: fullWidth ? '100%' : 'auto',
    opacity: loading ? 0.75 : 1,
    cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none',
    fontSize: '0.95rem',
  };

  const variants = {
    primary: {
      background: 'var(--fb-blue)',
      color: 'var(--text-on-primary)',
      padding: '13px 24px',
      boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)',
    },
    outline: {
      background: 'transparent',
      border: '2px solid var(--fb-blue)',
      color: 'var(--fb-blue)',
      padding: '11px 24px',
    },
    danger: {
      background: 'var(--danger-primary)',
      color: 'var(--text-on-primary)',
      padding: '13px 24px',
      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)',
    }
  };

  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      disabled={loading}
      {...props}
    >
      {loading ? '· · ·' : children}
    </button>
  );
};

export default Button;
