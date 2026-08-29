import React, { useState, useEffect } from 'react';
import { ArrowLeft, Coins, ShieldAlert, CheckCircle, Loader2, TrendingUp } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface SponsorProps {
  paperId: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

/**
 * Sponsor Bounty page.
 *
 * The `sponsor_bounty(paper_id)` payable method existed on the contract from
 * v0.1 but had zero UI callers — a Gate 1 gap flagged during Explorer audit.
 * This page closes that gap: any wallet can top up the bounty pool of a paper
 * that is still OPEN or REVIEWING, growing the payout for aligned reviewers.
 */
export const Sponsor: React.FC<SponsorProps> = ({ paperId, account, onNavigate }) => {
  const [amount, setAmount] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [stepMsg, setStepMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paper, setPaper] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const client = makeClient(account || '0x0000000000000000000000000000000000000000');
        const p = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_paper',
          args: [paperId],
        }) as any;
        setPaper(p);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [paperId, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }
    const gen = parseFloat(amount);
    if (!isFinite(gen) || gen <= 0) {
      setError('Amount must be greater than 0 GEN.');
      return;
    }

    setSubmitting(true);
    setStepMsg('Signing sponsor_bounty transaction in MetaMask...');
    setError(null);

    try {
      const client = makeClient(account);
      const value = BigInt(Math.round(gen * 1000)) * BigInt(10 ** 15); // supports up to 3 decimals

      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'sponsor_bounty',
        args: [paperId],
        value,
      }) as any;

      if (typeof tx === 'string') {
        setStepMsg('Waiting for Studionet block confirmation...');
        await client.waitForTransactionReceipt({ hash: tx as any });
      }

      setSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'sponsor_bounty transaction failed on GenLayer Studionet.');
      setSubmitting(false);
    }
  };

  const currentBounty = paper?.bounty_pool
    ? (BigInt(paper.bounty_pool) / BigInt(10 ** 18)).toString()
    : '?';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('paper', paperId)}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Paper #{paperId}</span>
      </button>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <span>Sponsor the Bounty Pool</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Grow paper <span className="font-mono text-teal-400">#{paperId}</span>'s bounty pool. Sponsors receive no payout — 100% of the sponsored GEN goes to aligned reviewers when the AI jury finalizes. Higher bounty attracts more reviewers and stronger critique.
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Current pool</div>
            <div className="text-2xl font-bold font-mono text-amber-400">{currentBounty}</div>
            <div className="text-[10px] text-slate-500 font-mono">GEN</div>
          </div>
        </div>

        {paper && paper.state !== 'OPEN' && paper.state !== 'REVIEWING' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            This paper is already in state <span className="font-mono font-bold">{paper.state}</span>. Contract will reject sponsor_bounty on closed papers.
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" />
            <h3 className="text-lg font-bold text-slate-100">Bounty topped up on Studionet</h3>
            <p className="text-xs text-slate-300">
              Contract accepted your GEN into paper #{paperId}'s bounty pool. Aligned reviewers will receive the full amount when the AI jury finalizes.
            </p>
            <button
              onClick={() => onNavigate('paper', paperId)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-sm"
            >
              Return to Paper Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Sponsor amount (GEN)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 pr-14 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="absolute right-4 top-2.5 text-slate-500 text-xs font-mono">GEN</span>
              </div>
              <div className="flex space-x-2 mt-2">
                {['1', '5', '10', '25'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono hover:text-amber-300 hover:border-amber-500/40 transition"
                  >
                    {v} GEN
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sponsor deposit:</span>
                <span className="font-mono text-slate-200">{amount || '0'} GEN</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sponsor payout:</span>
                <span className="font-mono text-rose-400">0 GEN (irrevocable)</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-400 pt-2 border-t border-slate-800">
                <span>Goes to aligned reviewers:</span>
                <span className="font-mono">{amount || '0'} GEN</span>
              </div>
            </div>

            {submitting && stepMsg && (
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-amber-300 flex items-center space-x-2 font-mono">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>{stepMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !account}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <Coins className="w-4 h-4" />
              <span>{submitting ? 'Processing Transaction...' : `Sponsor ${amount || '0'} GEN`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
