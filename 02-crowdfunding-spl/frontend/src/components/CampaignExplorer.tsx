import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import type { ToastData } from './Toast.tsx';
import { CampaignCard } from './CampaignCard.tsx';
import { ContributeModal } from './ContributeModal.tsx';
import {
  fetchAllCampaigns,
  getProgram,
  getVaultPDA,
  getContributionPDA,
  getATA,
  toBaseUnits,
  TOKEN_DECIMALS,
  TOKEN_PROGRAM_ID,
  type CampaignAccount,
  getCampaignStatus,
} from '../program.ts';

interface CampaignExplorerProps {
  showToast: (t: ToastData) => void;
  onSuccess: () => void;
}

type FilterStatus = 'all' | 'active' | 'funded' | 'expired';

export function CampaignExplorer({ showToast, onSuccess }: CampaignExplorerProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<CampaignAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [contributingTo, setContributingTo] = useState<CampaignAccount | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchAllCampaigns(connection, wallet);
      // Sort: active first, then by deadline descending
      all.sort((a, b) => {
        const sa = getCampaignStatus(a);
        const sb = getCampaignStatus(b);
        const order: Record<string, number> = { active: 0, funded: 1, expired: 2, withdrawn: 3 };
        if (order[sa] !== order[sb]) return order[sa] - order[sb];
        return b.deadline.toNumber() - a.deadline.toNumber();
      });
      setCampaigns(all);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleContribute = async (amount: string) => {
    if (!wallet.publicKey || !contributingTo) return;
    const c = contributingTo;
    const program = getProgram(connection, wallet);
    const campaignPubkey = c.publicKey;
    const [vault] = getVaultPDA(campaignPubkey);
    const [contribution] = getContributionPDA(campaignPubkey, wallet.publicKey);
    const contributorTokenAccount = getATA(c.tokenMint, wallet.publicKey);
    const bnAmount = toBaseUnits(amount, TOKEN_DECIMALS);

    const sig = await program.methods
      .contribute(bnAmount)
      .accountsPartial({
        contributor: wallet.publicKey,
        campaign: campaignPubkey,
        vault,
        contribution,
        contributorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    showToast({
      type: 'success',
      title: 'Contribution sent! 💰',
      message: `You contributed ${amount} tokens to "${c.title}".`,
      txSig: sig,
    });
    onSuccess();
    loadCampaigns();
  };

  const handleRefund = async (c: CampaignAccount) => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram(connection, wallet);
      const [vault] = getVaultPDA(c.publicKey);
      const [contribution] = getContributionPDA(c.publicKey, wallet.publicKey);
      const contributorTokenAccount = getATA(c.tokenMint, wallet.publicKey);

      const sig = await program.methods
        .claimRefund()
        .accountsPartial({
          contributor: wallet.publicKey,
          campaign: c.publicKey,
          vault,
          contribution,
          contributorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      showToast({
        type: 'success',
        title: 'Refund claimed! ↩',
        message: `Your contribution to "${c.title}" has been refunded.`,
        txSig: sig,
      });
      onSuccess();
      loadCampaigns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast({ type: 'error', title: 'Refund failed', message });
    }
  };

  const filtered =
    filter === 'all' ? campaigns : campaigns.filter((c) => getCampaignStatus(c) === filter);

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: campaigns.length },
    { key: 'active', label: '🟢 Active', count: campaigns.filter((c) => getCampaignStatus(c) === 'active').length },
    { key: 'funded', label: '⭐ Funded', count: campaigns.filter((c) => getCampaignStatus(c) === 'funded').length },
    { key: 'expired', label: '🔴 Expired', count: campaigns.filter((c) => getCampaignStatus(c) === 'expired').length },
  ];

  return (
    <div>
      {/* Hero section */}
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 12,
            letterSpacing: '-0.03em',
          }}
        >
          Explore Campaigns
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>
          Discover and fund projects on Solana. Every contribution is secured by program-controlled
          vaults on-chain.
        </p>
      </div>

      {/* Stats bar */}
      <div
        className="glass-card animate-fade-in stagger-1"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          {
            label: 'Active Now',
            value: campaigns.filter((c) => getCampaignStatus(c) === 'active').length,
          },
          {
            label: 'Total Backers',
            value: campaigns.reduce((sum, c) => sum + c.contributorsCount.toNumber(), 0),
          },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '20px 16px',
              borderRight: i < 2 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="animate-fade-in stagger-2"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        {filters.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? 'btn-primary' : 'btn-outline'}
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div className="campaigns-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 180 }} />
              <div style={{ padding: 24 }}>
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '85%', marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 8, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-card animate-fade-in"
          style={{ padding: 64, textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No campaigns found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {filter !== 'all'
              ? 'Try a different filter or create the first campaign!'
              : 'Be the first to create a campaign on ChainFund!'}
          </p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {filtered.map((c) => (
            <CampaignCard
              key={c.publicKey.toBase58()}
              campaign={c}
              onContribute={() => setContributingTo(c)}
              onRefund={() => handleRefund(c)}
              isCreator={wallet.publicKey?.equals(c.creator)}
            />
          ))}
        </div>
      )}

      {/* Contribute modal */}
      {contributingTo && (
        <ContributeModal
          campaign={contributingTo}
          onClose={() => setContributingTo(null)}
          onSubmit={handleContribute}
        />
      )}
    </div>
  );
}
