import React from 'react';
import { Cpu, ShieldCheck, Loader2 } from 'lucide-react';

export const LoadingConsensus: React.FC = () => {
  return (
    <div className="p-8 rounded-2xl bg-slate-900 border border-teal-500/30 text-center max-w-xl mx-auto my-8 shadow-2xl shadow-teal-500/10">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Cpu className="w-8 h-8 text-teal-400 animate-pulse" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-100 mb-2">
        GenLayer AI Jury Consensus In Progress
      </h3>
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        Validators are rendering the preprint text, analyzing human reviews, and reaching agreement on the quality verdict and score tolerances.
      </p>

      <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-teal-400 font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Non-deterministic block execution (approx. 30s-60s)</span>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center space-x-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Optimistic Democracy equivalence check via gl.vm.run_nondet</span>
      </div>
    </div>
  );
};
