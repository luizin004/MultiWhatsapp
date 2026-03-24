'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body style={{ background: '#0B141A', color: '#E9EDEF', margin: 0, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <h2 style={{ color: '#f87171', fontSize: '1.125rem', fontWeight: 600 }}>Erro fatal</h2>
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#8696A0', wordBreak: 'break-word' }}>
              {error.message || 'Ocorreu um erro inesperado no aplicativo.'}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1.5rem',
                borderRadius: '9999px',
                backgroundColor: '#25D366',
                padding: '0.5rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#111B21',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
