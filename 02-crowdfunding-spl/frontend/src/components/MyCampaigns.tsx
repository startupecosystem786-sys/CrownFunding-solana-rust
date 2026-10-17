import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import type { ToastData } from './Toast.tsx';
import { CampaignCard } from './CampaignCard.tsx';
import { ContributeModal } from './ContributeModal.tsx';
import {
  fetchCampaignsByCreator,
  getProgram,
  getVaultPDA,
  getContributionPDA,
  getATA,
  toBaseUnits,
  TOKEN_DECIMALS,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  type CampaignAccount,
  getCampaignStatus,
} from '../program.ts';

interface MyCampaignsProps {
  showToast: (t: ToastData) => void;
  onSuccess: () => void;
}

export function MyCampaigns({ showToast, onSuccess }: MyCampaignsProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<CampaignAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributingTo, setContributingTo] = useState<CampaignAccount | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!wallet.publicKey) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const mine = await fetchCampaignsByCreator(connection, wallet, wallet.publicKey);
      mine.sort((a, b) => b.deadline.toNumber() - a.deadline.toNumber());
      setCampaigns(mine);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleWithdraw = async (c: CampaignAccount) => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram(connection, wallet);
      const [vault] = getVaultPDA(c.publicKey);
      const creatorTokenAccount = getATA(c.tokenMint, wallet.publicKey);

      const sig = await program.methods
        .withdraw()
        .accountsPartial({
          creator: wallet.publicKey,
          campaign: c.publicKey,
          vault,
          tokenMint: c.tokenMint,
          creatorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showToast({
        type: 'success',
        title: 'Funds withdrawn! 💎',
        message: `Successfully withdrew funds from "${c.title}".`,
        txSig: sig,
      });
      onSuccess();
      loadCampaigns();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast({ type: 'error', title: 'Withdraw failed', message });
    }
  };

  const handleContribute = async (amount: string) => {
    if (!wallet.publicKey || !contributingTo) return;
    const c = contributingTo;
    const program = getProgram(connection, wallet);
    const [vault] = getVaultPDA(c.publicKey);
    const [contribution] = getContributionPDA(c.publicKey, wallet.publicKey);
    const contributorTokenAccount = getATA(c.tokenMint, wallet.publicKey);
    const bnAmount = toBaseUnits(amount, TOKEN_DECIMALS);

    const sig = await program.methods
      .contribute(bnAmount)
      .accountsPartial({
        contributor: wallet.publicKey,
        campaign: c.publicKey,
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

  if (!wallet.connected) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: 64, textAlign: 'center', maxWidth: 520, margin: '60px auto' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }} className="animate-float">🔐</div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', marginBottom: 12 }}>
          Connect Your Wallet
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Connect your Solana wallet to view and manage the campaigns you've created.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'var(--gradient-warm)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}
        >
          My Campaigns
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage campaigns you've created. Withdraw funds when goals are met.
        </p>
      </div>

      {/* Summary cards */}
      {!loading && campaigns.length > 0 && (
        <div
          className="glass-card animate-fade-in stagger-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          {[
            { label: 'My Campaigns', value: campaigns.length, emoji: '📊' },
            {
              label: 'Active',
              value: campaigns.filter((c) => getCampaignStatus(c) === 'active').length,
              emoji: '🟢',
            },
            {
              label: 'Goal Met',
              value: campaigns.filter((c) => ['funded', 'withdrawn'].includes(getCampaignStatus(c))).length,
              emoji: '⭐',
            },
            {
              label: 'Total Backers',
              value: campaigns.reduce((sum, c) => sum + c.contributorsCount.toNumber(), 0),
              emoji: '👥',
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                padding: '20px 12px',
                borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.emoji}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="campaigns-grid">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card" style={{ overflow: 'hidden' }}>
              <div className="skeleton" style={{ height: 180 }} />
              <div style={{ padding: 24 }}>
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 8, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No campaigns yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You haven't created any campaigns. Head to the Create tab to launch your first one!
          </p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.publicKey.toBase58()}
              campaign={c}
              isCreator={true}
              onContribute={() => setContributingTo(c)}
              onWithdraw={() => handleWithdraw(c)}
            />
          ))}
        </div>
      )}

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
