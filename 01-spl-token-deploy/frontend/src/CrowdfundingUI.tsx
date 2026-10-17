import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

import idl from './crowdfunding-idl.json';
import deployedMint from '../../deployed-mint.json'; // The token mint from SPL token deployment
import lastCampaign from '../../../02-crowdfunding-spl/last-campaign.json'; // We will read the last created campaign

export default function CrowdfundingUI() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>("10");

  const runTx = async (txFn: (program: anchor.Program) => Promise<string>) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    setError(null);
    setTxSig(null);

    try {
      const provider = new anchor.AnchorProvider(connection, wallet as any, {
        commitment: "confirmed",
      });
      anchor.setProvider(provider);
      const program = new anchor.Program(idl as anchor.Idl, provider);

      const sig = await txFn(program);
      setTxSig(sig);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = () => {
    runTx(async (program) => {
      const campaignPubkey = new PublicKey(lastCampaign.campaign);
      const mintPubkey = new PublicKey(deployedMint.mint);
      
      const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), campaignPubkey.toBuffer()],
        program.programId
      );

      const [contribution] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("contribution"), campaignPubkey.toBuffer(), wallet.publicKey!.toBuffer()],
        program.programId
      );

      const contributorTokenAccount = getAssociatedTokenAddressSync(
        mintPubkey,
        wallet.publicKey!
      );

      // Convert human amount to base units
      const decimals = 9; // Assuming 9 for SPL Token we deployed
      const bnAmount = new anchor.BN(amount).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));

      return await program.methods
        .contribute(bnAmount)
        .accountsPartial({
          contributor: wallet.publicKey,
          campaign: campaignPubkey,
          vault,
          contribution,
          contributorTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    });
  };

  const handleWithdraw = () => {
    runTx(async (program) => {
      const campaignPubkey = new PublicKey(lastCampaign.campaign);
      const mintPubkey = new PublicKey(deployedMint.mint);

      const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), campaignPubkey.toBuffer()],
        program.programId
      );

      const creatorTokenAccount = getAssociatedTokenAddressSync(
        mintPubkey,
        wallet.publicKey!
      );

      return await program.methods
        .withdraw()
        .accountsPartial({
          creator: wallet.publicKey,
          campaign: campaignPubkey,
          vault,
          tokenMint: mintPubkey,
          creatorTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    });
  };

  return (
    <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-2">
        Crowdfunding
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        Contribute {deployedMint.symbol} to the active campaign!
      </p>

      {wallet.connected ? (
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col text-left">
            <label className="text-xs text-gray-400 mb-1">Contribution Amount ({deployedMint.symbol})</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={handleContribute}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Contribute 💰"}
          </button>
          
          <div className="border-t border-white/10 my-4"></div>
          
          <button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            Withdraw Funds (Creator Only)
          </button>
        </div>
      ) : (
        <p className="text-sm text-yellow-400">Please connect your wallet above.</p>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm w-full break-words">
          {error}
        </div>
      )}

      {txSig && (
        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm w-full">
          Success! View on Explorer: <br/>
          <a 
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} 
            target="_blank" 
            rel="noreferrer"
            className="underline text-green-300 break-all"
          >
            {txSig}
          </a>
        </div>
      )}
    </div>
  );
}
