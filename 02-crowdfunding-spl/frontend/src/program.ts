/**
 * Shared helpers for interacting with the crowdfunding program.
 */
import * as anchor from '@coral-xyz/anchor';
import { type Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import idl from './idl.json';

export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };

/* ── Program ID (from Anchor.toml / declare_id!) ───────────── */
export const PROGRAM_ID = new PublicKey(idl.address);
export const TOKEN_DECIMALS = 9; // default for most SPL tokens

/* ── Anchor program factory ────────────────────────────────── */
export function getProgram(connection: Connection, wallet: WalletContextState) {
  const provider = new anchor.AnchorProvider(connection as any, wallet as never, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);
  return new anchor.Program(idl as any, provider as any);
}

/* ── PDA derivation helpers ────────────────────────────────── */
export function getCampaignPDA(creator: PublicKey, campaignId: anchor.BN) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('campaign'), creator.toBuffer(), campaignId.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID,
  );
}

export function getVaultPDA(campaign: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), campaign.toBuffer()],
    PROGRAM_ID,
  );
}

export function getContributionPDA(campaign: PublicKey, contributor: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('contribution'), campaign.toBuffer(), contributor.toBuffer()],
    PROGRAM_ID,
  );
}

export function getATA(mint: PublicKey, owner: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner);
}

/* ── Campaign account type ─────────────────────────────────── */
export interface CampaignAccount {
  publicKey: PublicKey;
  creator: PublicKey;
  campaignId: anchor.BN;
  title: string;
  description: string;
  imageUrl: string;
  tokenMint: PublicKey;
  goal: anchor.BN;
  raised: anchor.BN;
  deadline: anchor.BN;
  withdrawn: boolean;
  contributorsCount: anchor.BN;
  bump: number;
  vaultBump: number;
}

/* ── Contribution account type ─────────────────────────────── */
export interface ContributionAccount {
  publicKey: PublicKey;
  campaign: PublicKey;
  contributor: PublicKey;
  amount: anchor.BN;
  lastContributedAt: anchor.BN;
  refunded: boolean;
  bump: number;
}

/* ── Fetch all campaigns ───────────────────────────────────── */
export async function fetchAllCampaigns(
  connection: Connection,
  wallet: WalletContextState,
): Promise<CampaignAccount[]> {
  const program = getProgram(connection, wallet);
  const accounts = await (program.account as any).campaign.all();
  return accounts.map((a: any) => ({
    publicKey: a.publicKey,
    ...(a.account as unknown as Omit<CampaignAccount, 'publicKey'>),
  }));
}

/* ── Fetch campaigns for a specific creator ────────────────── */
export async function fetchCampaignsByCreator(
  connection: Connection,
  wallet: WalletContextState,
  creator: PublicKey,
): Promise<CampaignAccount[]> {
  const all = await fetchAllCampaigns(connection, wallet);
  return all.filter((c) => c.creator.equals(creator));
}

/* ── Campaign status helper ────────────────────────────────── */
export type CampaignStatus = 'active' | 'funded' | 'expired' | 'withdrawn';

export function getCampaignStatus(c: CampaignAccount): CampaignStatus {
  if (c.withdrawn) return 'withdrawn';
  const now = Math.floor(Date.now() / 1000);
  const deadline = c.deadline.toNumber();
  const funded = c.raised.gte(c.goal);
  if (now < deadline) return funded ? 'funded' : 'active';
  return funded ? 'funded' : 'expired';
}

/* ── Format helpers ────────────────────────────────────────── */
export function formatTokenAmount(amount: anchor.BN, decimals = TOKEN_DECIMALS): string {
  const str = amount.toString().padStart(decimals + 1, '0');
  const integer = str.slice(0, str.length - decimals) || '0';
  const fraction = str.slice(str.length - decimals);
  // Trim trailing zeroes but keep at least 2 decimals
  const trimmed = fraction.replace(/0+$/, '').padEnd(2, '0');
  return `${Number(integer).toLocaleString()}.${trimmed}`;
}

export function toBaseUnits(amount: string, decimals = TOKEN_DECIMALS): anchor.BN {
  const [int, frac = ''] = amount.split('.');
  const paddedFrac = frac.padEnd(decimals, '0').slice(0, decimals);
  return new anchor.BN(int + paddedFrac);
}

export function timeRemaining(deadline: anchor.BN): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline.toNumber() - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
