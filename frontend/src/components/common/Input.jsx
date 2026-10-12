const Input = ({ label, error, style = {}, ...props }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '13px 16px',
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
          background: 'var(--bg-section-alt)',
          border: `1.5px solid ${error ? 'var(--danger-primary)' : 'var(--border-color)'}`,
          borderRadius: '10px',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
          boxShadow: error ? '0 0 0 3px rgba(229, 62, 62, 0.1)' : 'none',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) {
            e.target.style.borderColor = 'var(--fb-blue)';
            e.target.style.boxShadow = '0 0 0 3px rgba(24, 119, 242, 0.15)';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.boxShadow = 'none';
          }
        }}
        {...props}
      />
      {error && (
        <span style={{
          fontSize: '0.78rem',
          color: 'var(--danger-primary)',
          marginTop: '5px',
          display: 'block'
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
