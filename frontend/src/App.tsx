import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Submit } from './pages/Submit';
import { PaperDetail } from './pages/PaperDetail';
import { SubmitReview } from './pages/SubmitReview';
import { Finalize } from './pages/Finalize';
import { Sponsor } from './pages/Sponsor';
import { Leaderboard } from './pages/Leaderboard';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { OnboardingModal } from './components/OnboardingModal';
import { connectWallet } from './lib/wallet';

export const App: React.FC = () => {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [activePaperId, setActivePaperId] = useState<string>('0');
  const [activeAddress, setActiveAddress] = useState<string>('');

  useEffect(() => {
    if (!window.ethereum) return;
    (async () => {
      try {
        const accs = await window.ethereum.request({ method: 'eth_accounts' });
        if (Array.isArray(accs) && accs.length > 0) {
          setAccount(accs[0] as `0x${string}`);
        }
      } catch {
        /* wallet unavailable — user can still browse read-only */
      }
    })();
    const handleAccountsChanged = (accs: string[]) => {
      setAccount(accs.length > 0 ? (accs[0] as `0x${string}`) : null);
    };
    const handleChainChanged = () => window.location.reload();
    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);
    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
    } catch (err: any) {
      alert(err?.message || 'Failed to connect MetaMask');
    }
  };

  const handleNavigate = (page: string, arg?: string) => {
    setCurrentPage(page);
    if (arg !== undefined) {
      if (page === 'profile') {
        setActiveAddress(arg);
      } else {
        setActivePaperId(arg);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <OnboardingModal />
      <Header
        account={account}
        onConnect={handleConnect}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'home' && (
          <Home account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'submit' && (
          <Submit account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'paper' && (
          <PaperDetail paperId={activePaperId} account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'review' && (
          <SubmitReview paperId={activePaperId} account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'finalize' && (
          <Finalize paperId={activePaperId} account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'sponsor' && (
          <Sponsor paperId={activePaperId} account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'leaderboard' && (
          <Leaderboard account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'analytics' && (
          <Analytics account={account} onNavigate={handleNavigate} />
        )}
        {currentPage === 'profile' && (
          <Profile address={activeAddress} account={account} onNavigate={handleNavigate} />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            PeerCoin — Built for GenLayer studionet (`chainId 61999`)
          </div>
          <div className="flex space-x-4">
            <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">GenLayer Studio</a>
            <a href="https://portal.genlayer.foundation" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">GenLayer Portal</a>
            <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">Explorer</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
