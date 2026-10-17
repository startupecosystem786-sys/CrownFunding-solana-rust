import { useMemo, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

import { CampaignExplorer } from './components/CampaignExplorer.tsx';
import { CreateCampaign } from './components/CreateCampaign.tsx';
import { MyCampaigns } from './components/MyCampaigns.tsx';
import { Toast, type ToastData } from './components/Toast.tsx';

type Tab = 'explore' | 'create' | 'mine';

export default function App() {
  const endpoint = useMemo(() => 'https://api.devnet.solana.com', []);
  const wallets = useMemo(() => [], []);
  const [activeTab, setActiveTab] = useState<Tab>('explore');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (data: ToastData) => {
    setToast(data);
    setTimeout(() => setToast(null), 8000);
  };

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'explore', label: 'Explore', icon: '🌍' },
    { key: 'create', label: 'Create', icon: '✨' },
    { key: 'mine', label: 'My Campaigns', icon: '👤' },
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ─── Header ─── */}
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 32px',
                borderBottom: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(16px)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(10, 14, 26, 0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🚀</span>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  ChainFund
                </h1>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#a78bfa',
                    fontWeight: 600,
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  DEVNET
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Tab navigation */}
                <nav style={{ display: 'flex', gap: 0 }}>
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      <span style={{ marginRight: 6 }}>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </nav>
                <WalletMultiButton />
              </div>
            </header>

            {/* ─── Main content ─── */}
            <main
              style={{
                flex: 1,
                maxWidth: 1200,
                width: '100%',
                margin: '0 auto',
                padding: '32px 24px',
              }}
            >
              {activeTab === 'explore' && (
                <CampaignExplorer
                  key={`explore-${refreshKey}`}
                  showToast={showToast}
                  onSuccess={triggerRefresh}
                />
              )}
              {activeTab === 'create' && (
                <CreateCampaign
                  showToast={showToast}
                  onSuccess={() => {
                    triggerRefresh();
                    setActiveTab('explore');
                  }}
                />
              )}
              {activeTab === 'mine' && (
                <MyCampaigns
                  key={`mine-${refreshKey}`}
                  showToast={showToast}
                  onSuccess={triggerRefresh}
                />
              )}
            </main>

            {/* ─── Footer ─── */}
            <footer
              style={{
                textAlign: 'center',
                padding: '24px',
                borderTop: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}
            >
              Built on Solana · Anchor 0.30.1 · ChainFund Crowdfunding dApp
            </footer>
          </div>

          {/* Toast notification */}
          {toast && <Toast data={toast} onClose={() => setToast(null)} />}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
