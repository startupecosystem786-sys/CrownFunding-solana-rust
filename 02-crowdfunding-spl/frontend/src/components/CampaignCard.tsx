import type { CampaignAccount } from '../program.ts';
import {
  getCampaignStatus,
  formatTokenAmount,
  timeRemaining,
  shortenAddress,
} from '../program.ts';

interface CampaignCardProps {
  campaign: CampaignAccount;
  onContribute?: (c: CampaignAccount) => void;
  onWithdraw?: (c: CampaignAccount) => void;
  onRefund?: (c: CampaignAccount) => void;
  isCreator?: boolean;
}

export function CampaignCard({
  campaign: c,
  onContribute,
  onWithdraw,
  onRefund,
  isCreator,
}: CampaignCardProps) {
  const status = getCampaignStatus(c);
  const pct = c.goal.isZero() ? 0 : Math.min(100, c.raised.muln(100).div(c.goal).toNumber());

  const badgeClass: Record<string, string> = {
    active: 'badge-active',
    funded: 'badge-funded',
    expired: 'badge-expired',
    withdrawn: 'badge-withdrawn',
  };

  const badgeLabel: Record<string, string> = {
    active: '● Live',
    funded: '★ Goal Met',
    expired: '✕ Expired',
    withdrawn: '✓ Withdrawn',
  };

  return (
    <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
      {/* Campaign image */}
      {c.imageUrl ? (
        <div
          style={{
            width: '100%',
            height: 180,
            background: `url(${c.imageUrl}) center/cover no-repeat`,
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 50%, rgba(10,14,26,0.9) 100%)',
            }}
          />
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span className={`badge ${badgeClass[status]}`}>{badgeLabel[status]}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: 120,
            background: 'var(--gradient-primary)',
            opacity: 0.15,
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span className={`badge ${badgeClass[status]}`}>{badgeLabel[status]}</span>
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '20px 24px' }}>
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {c.title}
        </h3>

        <p
          style={{
            margin: '0 0 16px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {c.description || 'No description provided.'}
        </p>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatTokenAmount(c.raised)}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              of {formatTokenAmount(c.goal)} goal
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>{pct}% funded</span>
            <span>{c.contributorsCount.toNumber()} backer{c.contributorsCount.toNumber() !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Info row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <span title={c.creator.toBase58()}>
            By {shortenAddress(c.creator.toBase58())}
          </span>
          <span>{timeRemaining(c.deadline)}</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {status === 'active' && onContribute && (
            <button
              className="btn-success"
              style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}
              onClick={() => onContribute(c)}
            >
              💰 Contribute
            </button>
          )}

          {(status === 'funded' || status === 'active') && isCreator && onWithdraw && status === 'funded' && (
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}
              onClick={() => onWithdraw(c)}
            >
              💎 Withdraw
            </button>
          )}

          {status === 'expired' && onRefund && (
            <button
              className="btn-danger"
              style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}
              onClick={() => onRefund(c)}
            >
              ↩ Claim Refund
            </button>
          )}

          {status === 'withdrawn' && (
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '0.82rem',
                color: 'var(--accent-amber)',
                padding: '10px',
              }}
            >
              Funds withdrawn ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
