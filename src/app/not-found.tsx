export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: 40,
    }}>
      <h1 style={{ fontSize: 64, marginBottom: 16 }}>404</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Model not found</p>
      <a
        href="/"
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          borderRadius: 8,
          color: 'white',
          fontWeight: 500,
        }}
      >
        Go Home
      </a>
    </div>
  );
}
