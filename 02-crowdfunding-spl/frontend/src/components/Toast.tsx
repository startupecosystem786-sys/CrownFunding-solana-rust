export interface ToastData {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  txSig?: string;
}

interface ToastProps {
  data: ToastData;
  onClose: () => void;
}

export function Toast({ data, onClose }: ToastProps) {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: '✅' },
    error: { bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)', icon: '❌' },
    info: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', icon: 'ℹ️' },
  };

  const c = colors[data.type];

  return (
    <div className="toast">
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          background: c.bg,
          border: `1px solid ${c.border}`,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              marginBottom: 4,
              color: 'var(--text-primary)',
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              wordBreak: 'break-word',
            }}
          >
            {data.message}
          </div>
          {data.txSig && (
            <a
              href={`https://explorer.solana.com/tx/${data.txSig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontSize: '0.78rem',
                color: '#a78bfa',
                textDecoration: 'underline',
              }}
            >
              View on Solana Explorer ↗
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 18,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
