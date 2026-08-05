import React, { useState } from 'react';
import { ArrowLeft, Send, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface SubmitReviewProps {
  paperId: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const SubmitReview: React.FC<SubmitReviewProps> = ({ paperId, account, onNavigate }) => {
  const [verdict, setVerdict] = useState('ACCEPT');
  const [confidence, setConfidence] = useState(80);
  const [reviewUrl, setReviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stepMsg, setStepMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }
    if (!reviewUrl.trim()) {
      setError('Review document URL is required.');
      return;
    }

    setSubmitting(true);
    setStepMsg('Signing transaction in MetaMask...');
    setError(null);

    try {
      const client = makeClient(account);
      const stakeValue = BigInt(20) * BigInt(10**18); // 20 GEN

      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'submit_review',
        args: [paperId, verdict, confidence, reviewUrl.trim()],
        value: stakeValue,
      }) as any;

      if (typeof tx === 'string') {
        setStepMsg('Waiting for Studionet block confirmation...');
        await client.waitForTransactionReceipt({ hash: tx as any });
      }

      setSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Transaction failed on GenLayer Studionet. Check wallet balance or console.');
      setSubmitting(false);
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

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Submit Human Peer Review</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Reviewers stake <strong className="text-teal-400 font-mono">20 GEN</strong> on GenLayer Studionet. If your verdict matches the GenLayer AI jury outcome, you earn back your stake plus a share of non-aligned reviewer stakes and +5 Reputation points.
        </p>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" />
            <h3 className="text-lg font-bold text-slate-100">Review Submitted & Staked on Studionet!</h3>
            <p className="text-xs text-slate-300">
              Your review is stored on-chain. When the AI jury is triggered, alignment will be evaluated.
            </p>
            <button
              onClick={() => onNavigate('paper', paperId)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm"
            >
              Return to Paper Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Verdict Recommendation *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'ACCEPT', label: 'Accept (Positive)' },
                  { id: 'WEAK_ACCEPT', label: 'Weak Accept (Positive)' },
                  { id: 'WEAK_REJECT', label: 'Weak Reject (Negative)' },
                  { id: 'REJECT', label: 'Reject (Negative)' },
                ].map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setVerdict(v.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition ${
                      verdict === v.id
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confidence Score *
                </label>
                <span className="font-mono text-sm text-teal-400 font-bold">{confidence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Public Review Text / Gist URL *
              </label>
              <input
                type="url"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                placeholder="https://gist.github.com/username/review123"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Link to your detailed rationale. GenLayer AI validators render this web page during consensus.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Required Reviewer Deposit:</span>
                <span className="font-mono text-teal-400 font-bold">20 GEN</span>
              </div>
            </div>

            {submitting && stepMsg && (
              <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/30 text-xs text-teal-300 flex items-center space-x-2 font-mono">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>{stepMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !account}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Processing Transaction...' : 'Submit & Stake 20 GEN'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
