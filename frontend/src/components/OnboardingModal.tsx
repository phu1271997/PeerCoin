import React, { useEffect, useState } from 'react';
import { X, Wallet, Cpu, ShieldCheck, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'peercoin_onboarding_v1_dismissed';

export const OnboardingModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage blocked (private mode etc.) — just show the modal once per pageload
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative max-w-lg w-full rounded-3xl bg-slate-900 border border-teal-500/30 shadow-2xl p-8 space-y-6">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          aria-label="Dismiss onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>First time here?</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 leading-tight">
            Welcome to PeerCoin
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            You need a funded MetaMask wallet on <span className="text-teal-400 font-mono">GenLayer studionet</span> to submit preprints, review, or trigger the AI jury. Three steps:
          </p>
        </div>

        <ol className="space-y-4">
          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-400 font-mono">
              1
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-teal-400" />
                <span>Connect MetaMask</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click <strong className="text-slate-200">Connect Wallet</strong> at the top right. PeerCoin will add or switch to the GenLayer Studio Network (`chainId 61999`) for you.
              </p>
            </div>
          </li>

          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-400 font-mono">
              2
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span>Fund your address on studionet</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Open the GenLayer Studio <strong className="text-slate-200">Accounts</strong> panel and transfer GEN from a pre-funded Studio account to your MetaMask address. You need at least 20 GEN to review or 100 GEN to submit a preprint.
              </p>
              <a
                href="https://studio.genlayer.com/contracts"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:underline mt-1"
              >
                <span>Open Studio Accounts</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </li>

          <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-teal-400 font-mono">
              3
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-100">
                Submit or review
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse preprints on the Home page, or hit <strong className="text-slate-200">Submit Preprint</strong> to publish one yourself. Anyone can trigger the AI jury once the minimum reviews are in.
              </p>
            </div>
          </li>
        </ol>

        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition"
          >
            Got it — take me to the preprints
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-2">
            This message will not show again on this device.
          </p>
        </div>
      </div>
    </div>
  );
};
