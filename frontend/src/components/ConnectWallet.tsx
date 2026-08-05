import React from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';

interface ConnectWalletProps {
  account: `0x${string}` | null;
  onConnect: () => void;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ account, onConnect }) => {
  if (account) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-slate-200">
        <CheckCircle2 className="w-4 h-4 text-teal-400" />
        <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-teal-500/20"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect MetaMask</span>
    </button>
  );
};
