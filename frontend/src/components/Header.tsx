import React from 'react';
import { ConnectWallet } from './ConnectWallet';
import { FileText, Award, PlusCircle, Home, BarChart3 } from 'lucide-react';

interface HeaderProps {
  account: `0x${string}` | null;
  onConnect: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ account, onConnect, currentPage, onNavigate }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <FileText className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
                PeerCoin
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                studionet
              </span>
            </div>
            <p className="text-xs text-slate-400">Decentralized Peer Review with AI Jury</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentPage === 'home'
                ? 'bg-slate-800 text-teal-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Preprints</span>
          </button>
          <button
            onClick={() => onNavigate('submit')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentPage === 'submit'
                ? 'bg-slate-800 text-teal-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Preprint</span>
          </button>
          <button
            onClick={() => onNavigate('leaderboard')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentPage === 'leaderboard'
                ? 'bg-slate-800 text-teal-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentPage === 'analytics'
                ? 'bg-slate-800 text-teal-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </nav>

        <div>
          <ConnectWallet account={account} onConnect={onConnect} />
        </div>
      </div>
    </header>
  );
};
