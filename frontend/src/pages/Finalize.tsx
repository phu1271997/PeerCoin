import React, { useState } from 'react';
import { ArrowLeft, Play, ShieldAlert, CheckCircle } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { LoadingConsensus } from '../components/LoadingConsensus';

interface FinalizeProps {
  paperId: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const Finalize: React.FC<FinalizeProps> = ({ paperId, account, onNavigate }) => {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTriggerJury = async () => {
    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setTimeout(() => {
          setExecuting(false);
          setSuccess(true);
        }, 3000);
        return;
      }

      const client = makeClient(account);
      await client.writeContract({
        address: CONTRACT_ADDRESS,
        method: 'finalize',
        args: [paperId],
      });

      setExecuting(false);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Transaction failed. Minimum review threshold or window may not be met.');
      setExecuting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('paper', paperId)}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Paper #{paperId}</span>
      </button>

      {executing ? (
        <LoadingConsensus />
      ) : (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Trigger GenLayer AI Jury Adjudication</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Anyone can trigger `finalize(paper_id)` once the preprint has received the minimum number of human reviews or the review window has expired.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto" />
              <h3 className="text-lg font-bold text-slate-100">AI Jury Finalized Successfully!</h3>
              <p className="text-xs text-slate-300">
                The non-deterministic AI consensus block has executed and state is updated on studionet.
              </p>
              <button
                onClick={() => onNavigate('paper', paperId)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm"
              >
                View Final Verdict & Rationale
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-teal-400">What happens when you click Trigger:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>GenLayer validators fetch the preprint text on-chain (`gl.nondet.web.render`).</li>
                  <li>Validators fetch the human review document texts.</li>
                  <li>LLMs evaluate methodology rigor, novelty, and reproducibility.</li>
                  <li>Validators compare semantic verdicts and sub-score tolerances (±15 points).</li>
                  <li>State updates to FINALIZED, setting scores and alignment flags.</li>
                </ul>
              </div>

              <button
                onClick={handleTriggerJury}
                disabled={!account}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Execute On-Chain AI Consensus</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
