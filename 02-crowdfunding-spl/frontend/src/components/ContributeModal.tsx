import { useState } from 'react';
import type { CampaignAccount } from '../program.ts';
import { formatTokenAmount, toBaseUnits, TOKEN_DECIMALS } from '../program.ts';

interface ContributeModalProps {
  campaign: CampaignAccount;
  onClose: () => void;
  onSubmit: (amount: string) => Promise<void>;
}

export function ContributeModal({ campaign: c, onClose, onSubmit }: ContributeModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(amount);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const remaining = c.goal.sub(c.raised);
  const presets = ['10', '50', '100'];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, padding: 32 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Contribute to Campaign</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {formatTokenAmount(c.raised)} / {formatTokenAmount(c.goal)} raised · {formatTokenAmount(remaining)} remaining
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="input-label" htmlFor="contribute-amount">Amount (tokens)</label>
          <input
            id="contribute-amount"
            className="input-field"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="0.000000001"
            step="any"
            autoFocus
            style={{ marginBottom: 12 }}
          />

          {/* Quick preset buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className="btn-outline"
                style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                onClick={() => setAmount(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn-outline"
              style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
              onClick={() => setAmount(formatTokenAmount(remaining).replace(/,/g, ''))}
            >
              Max
            </button>
          </div>

          {amount && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              ≈ {toBaseUnits(amount, TOKEN_DECIMALS).toString()} base units
            </div>
          )}

          <button
            type="submit"
            className="btn-success"
            disabled={loading || !amount}
            style={{ width: '100%', padding: 14 }}
          >
            {loading ? 'Sending...' : '💰 Contribute'}
          </button>
        </form>
      </div>
    </div>
  );
}
