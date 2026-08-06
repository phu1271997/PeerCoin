import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, UserCheck, Play, Award, AlertTriangle, RefreshCw } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { VerdictCard } from '../components/VerdictCard';

interface PaperDetailProps {
  paperId: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const PaperDetail: React.FC<PaperDetailProps> = ({ paperId, account, onNavigate }) => {
  const [paper, setPaper] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchPaperData();
  }, [paperId, account]);

  const fetchPaperData = async (retriesLeft = 5) => {
    if (retriesLeft === 5) {
      setLoading(true);
      setError(null);
    }
    try {
      const client = makeClient(account || '0x0000000000000000000000000000000000000000');
      const p = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_paper',
        args: [paperId],
      }) as any;

      setPaper(p);

      if (p && p.reviewer_ids) {
        const revList = [];
        for (const rid of p.reviewer_ids) {
          try {
            const r = await client.readContract({
              address: CONTRACT_ADDRESS,
              functionName: 'get_review',
              args: [paperId, rid],
            });
            revList.push(r);
          } catch (e) {
            console.error(e);
          }
        }
        setReviews(revList);
      }
      setLoading(false);
    } catch (err: any) {
      console.error(`get_paper(${paperId}) attempt failed, ${retriesLeft} retries left:`, err);
      if (retriesLeft > 0) {
        setTimeout(() => {
          fetchPaperData(retriesLeft - 1);
        }, 3000);
        return;
      }
      setError(
        `Paper #${paperId} not found on contract ${CONTRACT_ADDRESS.slice(0, 10)}… after 5 retries. ` +
        `Either the submit_paper transaction reverted (check the tx on the Explorer — a FINALIZED tx that reverted still consumes a nonce) ` +
        `or this paper ID does not exist yet. Return to the preprints list to see all published papers.`
      );
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!account) return;
    setClaiming(true);
    setClaimStatus(null);
    try {
      const client = makeClient(account);
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'claim',
        args: [paperId],
        value: 0n,
      }) as any;

      if (typeof tx === 'string') {
        await client.waitForTransactionReceipt({ hash: tx as any });
      }

      setClaimStatus('Rewards claimed successfully on studionet!');
      fetchPaperData(0);
    } catch (err: any) {
      setClaimStatus(`Claim failed: ${err?.message || 'Transaction error'}`);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm space-y-2">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400" />
        <div>Querying `get_paper(#{paperId})` directly from GenLayer Studionet RPC...</div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center p-12 bg-slate-900 rounded-3xl border border-slate-800">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Paper #{paperId} Not Finalized or Found Yet</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          The transaction to create Paper #{paperId} may still be confirming on GenLayer Studionet, or this paper ID does not exist on contract <code className="text-teal-400 font-mono">{CONTRACT_ADDRESS.slice(0, 10)}...</code>.
        </p>

        <div className="flex justify-center space-x-3">
          <button
            onClick={() => fetchPaperData(2)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 hover:opacity-90 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-query Studionet</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Return to Preprints List
          </button>
        </div>
      </div>
    );
  }

  const isFinalized = paper.state === 'FINALIZED';
  const isFailed = paper.state === 'FAILED';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Preprints</span>
      </button>

      {/* Header Info */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-mono font-semibold uppercase">
              {paper.field}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: #{paper.id}</span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={paper.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <span>Source Preprint PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {!isFinalized && !isFailed && (
              <button
                onClick={() => onNavigate('review', paper.id)}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold hover:opacity-90 transition"
              >
                Submit Human Review
              </button>
            )}

            {!isFinalized && !isFailed && (
              <button
                onClick={() => onNavigate('finalize', paper.id)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 border border-teal-500/40 text-teal-400 hover:bg-teal-500/10 text-xs font-bold transition flex items-center space-x-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Trigger AI Jury</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 leading-tight mb-3">
            {paper.title}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {paper.abstract}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div>
            <div className="text-xs text-slate-500">Author</div>
            <div className="text-xs font-mono font-semibold text-slate-200 truncate">{paper.author}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Author Stake</div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {(BigInt(paper.author_stake || '0') / BigInt(10**18)).toString()} GEN
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Bounty Pool</div>
            <div className="text-xs font-mono font-semibold text-slate-200">
              {(BigInt(paper.bounty_pool || '0') / BigInt(10**18)).toString()} GEN
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">State</div>
            <div className="text-xs font-mono font-semibold text-teal-400">{paper.state}</div>
          </div>
        </div>
      </div>

      {/* AI Jury Verdict Card */}
      {isFinalized && (
        <VerdictCard
          verdict={paper.ai_verdict}
          rigor={paper.ai_rigor}
          novelty={paper.ai_novelty}
          reproducibility={paper.ai_reproduc}
          reason={paper.ai_reason}
        />
      )}

      {/* Claim Rewards Panel */}
      {isFinalized && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Claim Skin-in-the-game Payout</span>
            </h3>
            <p className="text-xs text-slate-400">
              Aligned reviewers receive their 20 GEN stake + share of non-aligned reviewer stakes & bounty pool.
            </p>
            {claimStatus && (
              <p className="text-xs text-emerald-400 font-mono mt-2">{claimStatus}</p>
            )}
          </div>

          <button
            onClick={handleClaim}
            disabled={claiming || !account}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          >
            {claiming ? 'Claiming...' : 'Claim Stake + Bounty'}
          </button>
        </div>
      )}

      {/* Human Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-teal-400" />
          <span>Peer Reviews ({reviews.length})</span>
        </h3>

        {reviews.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No human reviews submitted yet on Studionet. Be the first reviewer to stake 20 GEN!
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xs font-mono text-slate-400">{r.reviewer}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-xs">
                      Verdict: {r.verdict}
                    </span>
                    <span className="text-xs text-slate-500">Confidence: {r.confidence}%</span>
                  </div>

                  <a
                    href={r.review_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:underline"
                  >
                    <span>View Full Review Text ({r.review_url})</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {isFinalized && (
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    r.aligned
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {r.aligned ? 'Aligned (+5 Rep)' : 'Misaligned (-3 Rep)'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
