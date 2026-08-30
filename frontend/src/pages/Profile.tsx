import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, User, FileText, UserCheck, Award, ExternalLink, Copy, Check,
  RefreshCw, CheckCircle2, XCircle, Coins, TrendingUp,
} from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS, REPUTATION_ADDRESS } from '../lib/client';

interface ProfileProps {
  address: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, arg?: string) => void;
}

/**
 * Profile — polymorphic actor page.
 *
 * Given any address, discovers everything on-chain about that actor:
 *   - Papers they authored (from list_papers filter by author)
 *   - Reviews they submitted (per-paper get_review lookup)
 *   - Reputation score from ReputationLedger.score(addr)
 *
 * Shows the union view so a single address that has both authored papers
 * AND submitted reviews reads as one identity, not two.
 */
export const Profile: React.FC<ProfileProps> = ({ address, account, onNavigate }) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Array<{ paperId: string; review: any; paper: any }>>([]);
  const [reputation, setReputation] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const client = makeClient(account || '0x0000000000000000000000000000000000000000');

        // 1. Fetch all papers
        const res = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'list_papers',
          args: [0, 200],
        }) as any;
        const items: any[] = Array.isArray(res?.items) ? res.items : [];

        // 2. Filter authored
        const authoredHere = items.filter(
          (p) => (p.author || '').toLowerCase() === address.toLowerCase(),
        );
        setPapers(authoredHere);

        // 3. Discover reviewed papers (this address in reviewer_ids on any paper)
        const reviewedPapers = items.filter(
          (p) => Array.isArray(p.reviewer_ids) &&
                 p.reviewer_ids.some((r: string) => r.toLowerCase() === address.toLowerCase()),
        );

        const reviewObjs: Array<{ paperId: string; review: any; paper: any }> = [];
        for (const p of reviewedPapers) {
          try {
            const r = await client.readContract({
              address: CONTRACT_ADDRESS,
              functionName: 'get_review',
              args: [p.id, address],
            });
            reviewObjs.push({ paperId: p.id, review: r, paper: p });
          } catch (e) {
            console.error(`get_review(${p.id}, ${address}) failed:`, e);
          }
        }
        setReviews(reviewObjs);

        // 4. Reputation score
        try {
          const s = await client.readContract({
            address: REPUTATION_ADDRESS,
            functionName: 'score',
            args: [address],
          });
          setReputation(typeof s === 'number' ? s : parseInt(String(s || 0)));
        } catch (e) {
          console.error('score fetch failed:', e);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address, account]);

  const stats = useMemo(() => {
    const finalized = papers.filter((p) => p.state === 'FINALIZED');
    const acceptCount = finalized.filter((p) => p.ai_verdict === 'ACCEPT').length;
    const rejectCount = finalized.filter((p) => p.ai_verdict === 'REJECT').length;
    const passRate = finalized.length > 0
      ? Math.round((acceptCount / finalized.length) * 100)
      : 0;

    const alignedReviews = reviews.filter((r) => r.review?.aligned).length;
    const totalReviews = reviews.length;
    const alignmentRate = totalReviews > 0
      ? Math.round((alignedReviews / totalReviews) * 100)
      : 0;

    return { finalizedCount: finalized.length, acceptCount, rejectCount, passRate, alignedReviews, totalReviews, alignmentRate };
  }, [papers, reviews]);

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silent */ }
  };

  const tier = reputationTier(reputation);
  const isSelf = account && account.toLowerCase() === address.toLowerCase();

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400 mb-2" />
        Discovering on-chain history for {address.slice(0, 10)}...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Preprints</span>
      </button>

      {/* Identity header */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/20 to-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
              <User className="w-8 h-8 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono uppercase tracking-wider">
                  {classifyActor(papers.length, reviews.length)}
                </span>
                {isSelf && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    That's you
                  </span>
                )}
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${tier.badgeClass}`}>
                  {tier.name}
                </span>
              </div>
              <button
                onClick={copyAddr}
                className="flex items-center space-x-1 text-sm font-mono font-semibold text-slate-200 hover:text-teal-300 transition group"
                title="Copy address"
              >
                <span className="truncate">{address}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                )}
              </button>
            </div>
          </div>
          <a
            href={`https://explorer-studio.genlayer.com/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Reputation summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
          <ProfileStat icon={<Award className="w-4 h-4 text-amber-400" />} label="Reputation" value={reputation > 0 ? `+${reputation}` : String(reputation)} highlight />
          <ProfileStat icon={<FileText className="w-4 h-4 text-teal-400" />} label="Papers authored" value={String(papers.length)} />
          <ProfileStat icon={<UserCheck className="w-4 h-4 text-emerald-400" />} label="Reviews submitted" value={String(reviews.length)} />
          <ProfileStat icon={<TrendingUp className="w-4 h-4 text-teal-400" />} label="Alignment rate" value={reviews.length > 0 ? `${stats.alignmentRate}%` : '—'} />
        </div>
      </div>

      {/* Author section */}
      {papers.length > 0 && (
        <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-teal-400" />
              <span>As Author — {papers.length} preprint{papers.length === 1 ? '' : 's'}</span>
            </h3>
            {stats.finalizedCount > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {stats.acceptCount} ACCEPT · {stats.rejectCount} REJECT · {stats.passRate}% pass rate on {stats.finalizedCount} finalized
              </p>
            )}
          </div>
          <div className="space-y-2">
            {papers.map((p) => (
              <PaperRow key={p.id} paper={p} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* Reviewer section */}
      {reviews.length > 0 && (
        <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>As Reviewer — {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
            </h3>
            {reviews.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {stats.alignedReviews} aligned · {reviews.length - stats.alignedReviews} misaligned · {stats.alignmentRate}% agreement with AI jury
              </p>
            )}
          </div>
          <div className="space-y-2">
            {reviews.map(({ paperId, review, paper }) => (
              <ReviewRow key={paperId} paperId={paperId} review={review} paper={paper} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {papers.length === 0 && reviews.length === 0 && (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          This address has not authored any preprint or submitted any review on this contract yet.
        </div>
      )}
    </div>
  );
};

const classifyActor = (papers: number, reviews: number): string => {
  if (papers > 0 && reviews > 0) return 'Author & Reviewer';
  if (papers > 0) return 'Author';
  if (reviews > 0) return 'Reviewer';
  return 'Observer';
};

const reputationTier = (score: number): { name: string; badgeClass: string } => {
  if (score >= 25) return { name: 'ESTABLISHED', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  if (score >= 10) return { name: 'TRUSTED', badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
  if (score >= 1) return { name: 'CONTRIBUTOR', badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30' };
  if (score === 0) return { name: 'NEWCOMER', badgeClass: 'bg-slate-800 text-slate-400 border-slate-700' };
  return { name: 'MISALIGNED', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
};

const ProfileStat: React.FC<{ icon: React.ReactNode; label: string; value: string; highlight?: boolean }> = ({ icon, label, value, highlight }) => (
  <div className={`p-3 rounded-xl border ${highlight ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-950 border-slate-800'}`}>
    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className={`text-lg font-bold font-mono ${highlight ? 'text-amber-300' : 'text-slate-100'}`}>{value}</div>
  </div>
);

const PaperRow: React.FC<{ paper: any; onNavigate: (p: string, id?: string) => void }> = ({ paper, onNavigate }) => {
  const isFinalized = paper.state === 'FINALIZED';
  const isAccept = paper.ai_verdict === 'ACCEPT';
  return (
    <button
      onClick={() => onNavigate('paper', paper.id)}
      className="w-full text-left p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono font-semibold uppercase">
              {paper.field}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">#{paper.id}</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-teal-300 transition">
            {paper.title || '(untitled)'}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400 flex items-center space-x-1">
            <Coins className="w-3 h-3" />
            <span>{(BigInt(paper.author_stake || '0') / BigInt(10 ** 18)).toString()}</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            isFinalized
              ? isAccept ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isFinalized ? paper.ai_verdict : paper.state}
          </span>
        </div>
      </div>
    </button>
  );
};

const ReviewRow: React.FC<{ paperId: string; review: any; paper: any; onNavigate: (p: string, id?: string) => void }> = ({ paperId, review, paper, onNavigate }) => {
  const isFinalized = paper.state === 'FINALIZED';
  return (
    <button
      onClick={() => onNavigate('paper', paperId)}
      className="w-full text-left p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] text-slate-500 font-mono">Paper #{paperId}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono font-semibold">
              Verdict: {review.verdict}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">conf {review.confidence}%</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-emerald-300 transition">
            {paper.title || '(untitled)'}
          </div>
        </div>
        <div className="flex-shrink-0">
          {isFinalized ? (
            review.aligned ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Aligned +5</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold flex items-center space-x-1">
                <XCircle className="w-3 h-3" />
                <span>Misaligned -3</span>
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
              {paper.state}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
