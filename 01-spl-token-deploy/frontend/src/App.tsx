import React, { useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import '@solana/wallet-adapter-react-ui/styles.css';

import idl from './idl.json';
import deployedMint from '../../deployed-mint.json';
import CrowdfundingUI from './CrowdfundingUI';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function MintUI() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
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

      // The IDL doesn't perfectly match the TS generated type out of the box in the browser without generation,
      // so we use unknown mapping.
      const program = new anchor.Program(idl as anchor.Idl, provider);

      const mintPubkey = new PublicKey(deployedMint.mint);
      
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority"), mintPubkey.toBuffer()],
        program.programId
      );

      // Create Associated Token Account for the user if it doesn't exist.
      // Wait, the mintToWallet instruction takes a `tokenAccount` which it initializes via init_if_needed.
      const tokenAccount = anchor.utils.token.associatedAddress({
        mint: mintPubkey,
        owner: wallet.publicKey,
      });

      console.log("Minting to:", tokenAccount.toBase58());

      const sig = await program.methods
        .mintToWallet(new anchor.BN("1000000000")) // Mint 1 billion base units (1 token if 9 decimals)
        .accountsPartial({
          admin: wallet.publicKey,
          mint: mintPubkey,
          mintAuthority,
          recipient: wallet.publicKey,
          recipientTokenAccount: tokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      setTxSig(sig);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to mint. Are you using the Admin wallet?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
        Token Faucet
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        Mint <strong>{deployedMint.name} ({deployedMint.symbol})</strong> directly to your wallet.
      </p>

      {wallet.connected ? (
        <div className="w-full">
          <button
            onClick={handleMint}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Minting..." : "Mint Tokens 🚀"}
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

export default function App() {
  const endpoint = useMemo(() => "https://api.devnet.solana.com", []);
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="min-h-screen flex flex-col items-center py-12 px-6">
            <div className="mb-10 w-full max-w-4xl flex justify-end">
              <WalletMultiButton />
            </div>
            
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <MintUI />
              <CrowdfundingUI />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
