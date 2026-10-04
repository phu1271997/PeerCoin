import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, UserCheck, Play, Award, AlertTriangle, RefreshCw, TrendingUp, Copy, Check, Gavel } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { VerdictCard } from '../components/VerdictCard';
import { ShareBar } from '../components/ShareBar';
import { AddressLabel } from '../components/AddressLabel';
import { AppealCard } from '../components/AppealCard';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      /* clipboard blocked — silent */
    }
  };

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

  const handleClaim = async (fn: 'claim' | 'claim_appeal' = 'claim') => {
    if (!account) return;
    setClaiming(true);
    setClaimStatus(null);
    try {
      const client = makeClient(account);
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: fn,
        args: [paperId],
        value: 0n,
      }) as any;

      if (typeof tx === 'string') {
        await client.waitForTransactionReceipt({ hash: tx as any });
      }

      setClaimStatus(`${fn === 'claim_appeal' ? 'Appeal payout' : 'Rewards'} claimed successfully on studionet!`);
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
  const isAppealed = paper.state === 'APPEALED';
  const isAuthor = !!account && account.toLowerCase() === paper.author.toLowerCase();
  const isRejected = paper.ai_verdict === 'REJECT';
  const hasAppeal = paper.appeal != null;
  // Payouts on a REJECT are reserved until its appeal window closes / any
  // appeal resolves. These are the states we can know for certain client-side;
  // the within-window case is also enforced on-chain (claim reverts).
  const rejectClaimsReserved =
    isRejected && (isAppealed || (hasAppeal && !paper.appeal?.resolved));

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
                onClick={() => onNavigate('sponsor', paper.id)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition flex items-center space-x-1"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Sponsor Bounty</span>
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
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onNavigate('profile', paper.author)}
                className="text-xs font-mono font-semibold text-slate-200 truncate hover:text-teal-300 transition"
                title={`Open author profile — ${paper.author}`}
              >
                <AddressLabel address={paper.author} />
              </button>
              <button
                onClick={() => copyToClipboard(paper.author, 'author')}
                className="text-slate-500 hover:text-teal-400 transition flex-shrink-0"
                title="Copy author address"
              >
                {copiedField === 'author' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
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

      {/* Social share row */}
      <ShareBar
        paperId={paper.id}
        title={paper.title}
        verdict={isFinalized ? paper.ai_verdict : null}
        fieldTag={paper.field}
      />

      {/* AI Jury Verdict Card */}
      {(isFinalized || isFailed || isAppealed) && paper.ai_verdict && (
        <VerdictCard
          verdict={paper.ai_verdict}
          rigor={paper.ai_rigor}
          novelty={paper.ai_novelty}
          reproducibility={paper.ai_reproduc}
          reason={paper.ai_reason}
        />
      )}

      {/* Appeal Court block — status card if appealed, File Appeal button if eligible */}
      {hasAppeal && (
        <AppealCard
          paperId={paper.id}
          appeal={paper.appeal}
          account={account}
          onResolved={() => fetchPaperData(0)}
        />
      )}

      {!hasAppeal && (isFinalized || isFailed) && isRejected && isAuthor && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-amber-400" />
              <span>Disagree with the REJECT verdict?</span>
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              File an appeal. A second AI Jury will re-review the paper with an <span className="text-amber-300">adversarial-skeptic</span> prompt
              and a distinct APPEAL canary token. Overturn = your appeal stake back + 10% bounty bonus. Upheld = stake burned to bounty.
            </p>
          </div>
          <button
            onClick={() => onNavigate('file-appeal', paper.id)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:opacity-90 transition inline-flex items-center space-x-1.5 flex-shrink-0"
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>File Appeal</span>
          </button>
        </div>
      )}

      {/* Payouts reserved while an appeal is live / pending resolution */}
      {rejectClaimsReserved && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 text-sm text-amber-200 flex items-start space-x-2">
          <Gavel className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <span>
            Payouts on this REJECT are <span className="font-semibold">reserved</span> until the appeal
            window closes and any appeal resolves. Claims are frozen so funds can't be paid twice or
            an overturn left unfunded. Check back once the appeal is resolved.
          </span>
        </div>
      )}

      {/* Claim Rewards Panel */}
      {isFinalized && !rejectClaimsReserved && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 mb-1 flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Claim Skin-in-the-game Payout</span>
            </h3>
            <p className="text-xs text-slate-400">
              Aligned reviewers receive their 20 GEN stake + share of non-aligned reviewer stakes & bounty pool.
              {hasAppeal && paper.appeal.overturned && ' Author of an OVERTURNED paper must use the appeal claim below.'}
            </p>
            {claimStatus && (
              <p className="text-xs text-emerald-400 font-mono mt-2">{claimStatus}</p>
            )}
          </div>

          <button
            onClick={() => handleClaim('claim')}
            disabled={claiming || !account}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          >
            {claiming ? 'Claiming...' : 'Claim Stake + Bounty'}
          </button>
        </div>
      )}

      {/* Appeal-specific claim (OVERTURNED authors) */}
      {isFinalized && hasAppeal && paper.appeal.overturned && !paper.appeal.claimed && isAuthor && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-emerald-200 mb-1 flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-emerald-400" />
              <span>Claim Overturned Appeal — Stake + Bonus</span>
            </h3>
            <p className="text-xs text-slate-400">
              Adversarial re-jury flipped this to ACCEPT. Collect your appeal stake back plus the bounty-funded win bonus.
            </p>
          </div>
          <button
            onClick={() => handleClaim('claim_appeal')}
            disabled={claiming || !account}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          >
            {claiming ? 'Claiming...' : 'Claim Appeal Payout'}
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
                    <button
                      onClick={() => onNavigate('profile', r.reviewer)}
                      className="text-xs font-mono text-slate-400 hover:text-teal-300 transition truncate"
                      title={`Open reviewer profile — ${r.reviewer}`}
                    >
                      <AddressLabel address={r.reviewer} />
                    </button>
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
