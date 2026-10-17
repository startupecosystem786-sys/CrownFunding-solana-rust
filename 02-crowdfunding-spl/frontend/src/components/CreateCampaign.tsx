import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import type { ToastData } from './Toast.tsx';
import { getProgram, getVaultPDA, toBaseUnits, TOKEN_DECIMALS, TOKEN_PROGRAM_ID } from '../program.ts';

interface CreateCampaignProps {
  showToast: (t: ToastData) => void;
  onSuccess: () => void;
}

export function CreateCampaign({ showToast, onSuccess }: CreateCampaignProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tokenMint, setTokenMint] = useState('');
  const [goal, setGoal] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey) {
      showToast({ type: 'error', title: 'Wallet not connected', message: 'Please connect your wallet first.' });
      return;
    }

    setLoading(true);
    try {
      const program = getProgram(connection, wallet);
      const campaignId = new anchor.BN(Date.now());
      const mintPubkey = new anchor.web3.PublicKey(tokenMint.trim());

      const campaignIdBytes = campaignId.toArrayLike(Buffer, 'le', 8);
      const [campaignPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('campaign'), wallet.publicKey.toBuffer(), campaignIdBytes],
        program.programId,
      );
      const [vault] = getVaultPDA(campaignPDA);

      const goalBN = toBaseUnits(goal, TOKEN_DECIMALS);
      const durationBN = new anchor.BN(parseInt(durationDays));

      const sig = await program.methods
        .createCampaign(campaignId, title, description, imageUrl, goalBN, durationBN)
        .accountsPartial({
          creator: wallet.publicKey,
          tokenMint: mintPubkey,
          campaign: campaignPDA,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      showToast({
        type: 'success',
        title: 'Campaign Created! 🎉',
        message: `"${title}" is now live on Solana.`,
        txSig: sig,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setImageUrl('');
      setGoal('');
      setDurationDays('30');
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(err);
      showToast({ type: 'error', title: 'Failed to create campaign', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="animate-fade-in" style={{ marginBottom: 32, textAlign: 'center' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}
        >
          Launch Your Campaign
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Create a new crowdfunding campaign on Solana. Contributors send SPL tokens directly to a
          PDA-controlled vault.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card animate-fade-in stagger-1" style={{ padding: 32, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            📝 Campaign Details
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label className="input-label" htmlFor="cf-title">Title</label>
            <input
              id="cf-title"
              className="input-field"
              type="text"
              placeholder="Solar Panels for Rural Schools"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={64}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              {title.length}/64 characters (min 5)
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="input-label" htmlFor="cf-desc">Description</label>
            <textarea
              id="cf-desc"
              className="input-field"
              placeholder="Describe your project and what the funds will be used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              style={{ resize: 'vertical', minHeight: 80 }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              {description.length}/200 characters
            </span>
          </div>

          <div style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="cf-image">Image URL (optional)</label>
            <input
              id="cf-image"
              className="input-field"
              type="url"
              placeholder="https://example.com/campaign-image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <div className="glass-card animate-fade-in stagger-2" style={{ padding: 32, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            💰 Funding Parameters
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label className="input-label" htmlFor="cf-mint">Token Mint Address</label>
            <input
              id="cf-mint"
              className="input-field"
              type="text"
              placeholder="e.g. So11111111111111111111111111111111111111112"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              required
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="cf-goal">Goal Amount (tokens)</label>
              <input
                id="cf-goal"
                className="input-field"
                type="number"
                placeholder="1000"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                required
                min="0.000000001"
                step="any"
              />
            </div>
            <div>
              <label className="input-label" htmlFor="cf-duration">Duration (days)</label>
              <input
                id="cf-duration"
                className="input-field"
                type="number"
                placeholder="30"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
                min="1"
                max="365"
              />
            </div>
          </div>
        </div>

        <div className="animate-fade-in stagger-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !wallet.connected}
            style={{ width: '100%', padding: 16, fontSize: '1rem' }}
          >
            {loading ? (
              <span>Creating campaign...</span>
            ) : !wallet.connected ? (
              <span>Connect wallet to create</span>
            ) : (
              <span>🚀 Create Campaign</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
