import React, { useState } from 'react';
import { ArrowLeft, Send, ShieldAlert, CheckCircle } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface SubmitProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const Submit: React.FC<SubmitProps> = ({ account, onNavigate }) => {
  const [title, setTitle] = useState('');
  const [field, setField] = useState('cs');
  const [url, setUrl] = useState('');
  const [abstract, setAbstract] = useState('');
  const [bountyTopup, setBountyTopup] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError('Please connect your MetaMask wallet first.');
      return;
    }

    if (!title.trim() || !url.trim() || !abstract.trim()) {
      setError('Title, URL, and Abstract are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        // Simulated local submission if contract not set
        setTimeout(() => {
          setSubmitting(false);
          setSuccessId('0');
        }, 1500);
        return;
      }

      const client = makeClient(account);
      const authorStake = BigInt(100) * BigInt(10**18); // 100 GEN
      const topup = BigInt(Math.max(0, parseFloat(bountyTopup || '0'))) * BigInt(10**18);
      const totalValue = authorStake + topup;

      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        method: 'submit_paper',
        args: [title.trim(), field.trim(), url.trim(), abstract.trim()],
        value: totalValue,
      });

      setSubmitting(false);
      setSuccessId(tx || '0');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Transaction failed. Check console for details.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Preprints</span>
      </button>

      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Submit Preprint to PeerCoin</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Authors stake <strong className="text-teal-400 font-mono">100 GEN</strong> as skin-in-the-game. If the GenLayer AI jury approves your methodology (score ≥ 60), your stake is returned. Otherwise, it is forfeited to the aligned reviewer bounty pool.
        </p>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successId ? (
          <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" />
            <h3 className="text-lg font-bold text-slate-100">Preprint Submitted Successfully!</h3>
            <p className="text-xs text-slate-300">
              Your paper is now registered on GenLayer studionet and open for peer reviews.
            </p>
            <button
              onClick={() => onNavigate('paper', successId)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm"
            >
              View Paper Details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Paper Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Zero-Knowledge Proofs for Autonomous AI Agent Consensus"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Academic Field *
                </label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="cs">Computer Science (cs)</option>
                  <option value="biology">Biology / Medicine</option>
                  <option value="econ">Economics / Game Theory</option>
                  <option value="physics">Physics / Math</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Bounty Pool Topup (GEN)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bountyTopup}
                  onChange={(e) => setBountyTopup(e.target.value)}
                  placeholder="Optional extra bounty"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Preprint Public URL (arXiv / bioRxiv / OSF) *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://arxiv.org/abs/2401.00001"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must be an accessible web URL (`gl.nondet.web.render` reads this directly on-chain).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Abstract *
              </label>
              <textarea
                rows={4}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Brief summary of methodology, results, and artifacts..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Required Author Skin-in-the-game Stake:</span>
                <span className="font-mono text-slate-200">100 GEN</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bounty Pool Topup:</span>
                <span className="font-mono text-slate-200">{bountyTopup || '0'} GEN</span>
              </div>
              <div className="flex justify-between font-bold text-teal-400 pt-2 border-t border-slate-800">
                <span>Total Transaction Deposit:</span>
                <span className="font-mono">{100 + (parseFloat(bountyTopup || '0') || 0)} GEN</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !account}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting to Studionet...' : 'Submit & Deposit Stake'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
