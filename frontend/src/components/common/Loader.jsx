const Loader = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      background: 'var(--bg-base)'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--fb-blue)',
        borderRadius: '50%',
        animation: 'fh-spin 0.7s linear infinite'
      }} />
      <p style={{
        marginTop: '16px',
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        fontWeight: 600
      }}>
        Loading...
      </p>
    </div>
  );
};

export default Loader;
