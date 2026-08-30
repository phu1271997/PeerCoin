import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, PieChart, TrendingUp, FileText, Users, Coins,
  CheckCircle2, XCircle, RefreshCw, ExternalLink,
} from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS, REPUTATION_ADDRESS } from '../lib/client';
import { AddressLabel } from '../components/AddressLabel';

interface AnalyticsProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, arg?: string) => void;
}

interface ReviewerAgg {
  addr: string;
  reviewCount: number;
  score: number;
}

/**
 * Analytics — network-wide dashboard.
 *
 * Pure client aggregation over list_papers + per-reviewer ReputationLedger
 * lookups. No external chart library — SVG rendered inline to keep the bundle
 * lean. Every number links back to the on-chain query that produced it.
 */
export const Analytics: React.FC<AnalyticsProps> = ({ account, onNavigate }) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [reviewers, setReviewers] = useState<ReviewerAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = makeClient(account || '0x0000000000000000000000000000000000000000');
        const res = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'list_papers',
          args: [0, 200],
        }) as any;
        const items: any[] = Array.isArray(res?.items) ? res.items : [];
        setPapers(items);

        // Aggregate reviewers across every paper
        const counts = new Map<string, number>();
        for (const p of items) {
          if (Array.isArray(p.reviewer_ids)) {
            for (const rid of p.reviewer_ids) counts.set(rid, (counts.get(rid) || 0) + 1);
          }
        }
        const list: ReviewerAgg[] = [];
        for (const [addr, reviewCount] of counts.entries()) {
          let score = 0;
          try {
            const s = await client.readContract({
              address: REPUTATION_ADDRESS,
              functionName: 'score',
              args: [addr],
            });
            score = typeof s === 'number' ? s : parseInt(String(s || 0));
          } catch { /* ignore per-reviewer errors */ }
          list.push({ addr, reviewCount, score });
        }
        list.sort((a, b) => b.score - a.score);
        setReviewers(list);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load analytics data from studionet.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [account]);

  const stats = useMemo(() => {
    let stakedWei = 0n;
    let bountyWei = 0n;
    const byField: Record<string, number> = {};
    const byState: Record<string, number> = {};
    const verdictCounts: Record<string, number> = { ACCEPT: 0, REJECT: 0, BORDERLINE: 0 };
    let acceptRigorSum = 0, acceptCount = 0;
    let rejectRigorSum = 0, rejectCount = 0;
    let topAuthorPapers = 0;
    const byAuthor: Record<string, number> = {};

    for (const p of papers) {
      try {
        stakedWei += BigInt(p.author_stake || '0');
        bountyWei += BigInt(p.bounty_pool || '0');
      } catch { /* ignore */ }
      const field = (p.field || 'other').toLowerCase();
      byField[field] = (byField[field] || 0) + 1;
      byState[p.state] = (byState[p.state] || 0) + 1;
      if (p.ai_verdict && verdictCounts[p.ai_verdict] !== undefined) {
        verdictCounts[p.ai_verdict] += 1;
        const avg = ((p.ai_rigor || 0) + (p.ai_novelty || 0) + (p.ai_reproduc || 0)) / 3;
        if (p.ai_verdict === 'ACCEPT') { acceptRigorSum += avg; acceptCount += 1; }
        if (p.ai_verdict === 'REJECT') { rejectRigorSum += avg; rejectCount += 1; }
      }
      if (p.author) {
        byAuthor[p.author] = (byAuthor[p.author] || 0) + 1;
        if (byAuthor[p.author] > topAuthorPapers) topAuthorPapers = byAuthor[p.author];
      }
    }

    return {
      totalPapers: papers.length,
      totalReviewers: reviewers.length,
      stakedGen: Number(stakedWei / BigInt(10 ** 18)),
      bountyGen: Number(bountyWei / BigInt(10 ** 18)),
      byField,
      byState,
      verdictCounts,
      acceptAvg: acceptCount > 0 ? Math.round(acceptRigorSum / acceptCount) : 0,
      rejectAvg: rejectCount > 0 ? Math.round(rejectRigorSum / rejectCount) : 0,
      alignmentRate: reviewers.length > 0
        ? Math.round((reviewers.filter((r) => r.score > 0).length / reviewers.length) * 100)
        : 0,
      finalized: (byState['FINALIZED'] || 0) + (byState['FAILED'] || 0),
      topAuthors: Object.entries(byAuthor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [papers, reviewers]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400 mb-2" />
        Aggregating on-chain data from list_papers + ReputationLedger...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
          <BarChart3 className="w-4 h-4" />
          <span>On-Chain Analytics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Network Analytics Dashboard</h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
          Every number below is aggregated from <code className="text-teal-400 font-mono">list_papers</code> and per-reviewer <code className="text-teal-400 font-mono">ReputationLedger.score()</code> calls against the live PeerCoin studionet contracts. Refresh the page to re-query.
        </p>
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<FileText className="w-5 h-5 text-teal-400" />} label="Total preprints" value={String(stats.totalPapers)} sub={`${stats.finalized} finalized`} />
        <Kpi icon={<Users className="w-5 h-5 text-emerald-400" />} label="Distinct reviewers" value={String(stats.totalReviewers)} sub={`${stats.alignmentRate}% aligned rate`} />
        <Kpi icon={<Coins className="w-5 h-5 text-amber-400" />} label="Author stake escrowed" value={`${stats.stakedGen.toLocaleString()} GEN`} sub={`+${stats.bountyGen.toLocaleString()} in bounty`} />
        <Kpi icon={<TrendingUp className="w-5 h-5 text-teal-400" />} label="AI verdicts issued" value={String((stats.verdictCounts.ACCEPT || 0) + (stats.verdictCounts.REJECT || 0) + (stats.verdictCounts.BORDERLINE || 0))} sub={`${stats.verdictCounts.ACCEPT || 0} ACCEPT / ${stats.verdictCounts.REJECT || 0} REJECT`} />
      </div>

      {/* Verdict distribution + Field distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          icon={<PieChart className="w-5 h-5 text-teal-400" />}
          title="Verdict distribution"
          subtitle="Every finalized paper by AI jury outcome"
        >
          {stats.finalized === 0 ? (
            <EmptyChart>No papers finalized yet.</EmptyChart>
          ) : (
            <VerdictBars
              accept={stats.verdictCounts.ACCEPT || 0}
              reject={stats.verdictCounts.REJECT || 0}
              borderline={stats.verdictCounts.BORDERLINE || 0}
            />
          )}
        </ChartCard>

        <ChartCard
          icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
          title="Preprints by field"
          subtitle="Count of preprints broken down by academic field"
        >
          {stats.totalPapers === 0 ? (
            <EmptyChart>No preprints yet.</EmptyChart>
          ) : (
            <FieldBars data={stats.byField} />
          )}
        </ChartCard>
      </div>

      {/* Rigor score comparison */}
      {(stats.acceptAvg > 0 || stats.rejectAvg > 0) && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h4 className="text-sm font-semibold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Average AI rigor score by verdict</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RigorRow
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              label="ACCEPT papers avg"
              value={stats.acceptAvg}
              count={stats.verdictCounts.ACCEPT || 0}
              barColor="from-emerald-500 to-teal-400"
            />
            <RigorRow
              icon={<XCircle className="w-4 h-4 text-rose-400" />}
              label="REJECT papers avg"
              value={stats.rejectAvg}
              count={stats.verdictCounts.REJECT || 0}
              barColor="from-rose-500 to-amber-500"
            />
          </div>
        </div>
      )}

      {/* Top authors */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h4 className="text-sm font-semibold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Most active authors</span>
        </h4>
        {stats.topAuthors.length === 0 ? (
          <EmptyChart>No authors yet.</EmptyChart>
        ) : (
          <div className="space-y-2">
            {stats.topAuthors.map(([addr, count], idx) => (
              <button
                key={addr}
                onClick={() => onNavigate('profile', addr)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition text-left group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[11px] font-bold flex items-center justify-center font-mono flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-mono text-slate-200 truncate group-hover:text-teal-300">
                    <AddressLabel address={addr} />
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs font-mono text-slate-400">{count} paper{count === 1 ? '' : 's'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contract self-links */}
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Data sources</div>
        <a href={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="flex items-center space-x-1.5 hover:text-teal-400 transition">
          <ExternalLink className="w-3 h-3" />
          <span className="font-mono">PeerCoinCore.list_papers()</span>
        </a>
        <a href={`https://explorer-studio.genlayer.com/address/${REPUTATION_ADDRESS}`} target="_blank" rel="noreferrer" className="flex items-center space-x-1.5 hover:text-teal-400 transition">
          <ExternalLink className="w-3 h-3" />
          <span className="font-mono">ReputationLedger.score(addr)</span>
        </a>
      </div>
    </div>
  );
};

/* ---------------- Reusable components ---------------- */

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string }> = ({ icon, label, value, sub }) => (
  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
    <div className="flex items-center justify-between">
      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">{icon}</div>
    </div>
    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
    <div className="text-xl font-bold font-mono text-slate-100">{value}</div>
    <div className="text-[11px] text-slate-500 font-mono">{sub}</div>
  </div>
);

const ChartCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
    <div>
      <div className="flex items-center space-x-2 text-sm font-semibold text-slate-100">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{subtitle}</div>
    </div>
    {children}
  </div>
);

const EmptyChart: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center text-xs text-slate-500 py-8">{children}</div>
);

const VerdictBars: React.FC<{ accept: number; reject: number; borderline: number }> = ({ accept, reject, borderline }) => {
  const total = accept + reject + borderline || 1;
  return (
    <div className="space-y-3">
      <VerdictBar label="ACCEPT" count={accept} pct={(accept / total) * 100} color="bg-gradient-to-r from-emerald-500 to-teal-400" />
      <VerdictBar label="REJECT" count={reject} pct={(reject / total) * 100} color="bg-gradient-to-r from-rose-500 to-amber-500" />
      <VerdictBar label="BORDERLINE" count={borderline} pct={(borderline / total) * 100} color="bg-gradient-to-r from-amber-500 to-slate-500" />
    </div>
  );
};

const VerdictBar: React.FC<{ label: string; count: number; pct: number; color: string }> = ({ label, count, pct, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1 font-mono">
      <span className="text-slate-300 font-semibold">{label}</span>
      <span className="text-slate-400">{count} ({pct.toFixed(0)}%)</span>
    </div>
    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  </div>
);

const FieldBars: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v)) || 1;
  return (
    <div className="space-y-2.5">
      {entries.map(([field, count]) => (
        <div key={field}>
          <div className="flex justify-between text-xs mb-1 font-mono">
            <span className="text-slate-300 uppercase tracking-wider font-semibold">{field}</span>
            <span className="text-slate-400">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const RigorRow: React.FC<{ icon: React.ReactNode; label: string; value: number; count: number; barColor: string }> = ({ icon, label, value, count, barColor }) => (
  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2 text-slate-300 font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono text-slate-400">n={count}</span>
    </div>
    <div className="flex items-end space-x-2">
      <div className="text-3xl font-bold font-mono text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 font-mono pb-1">/100</div>
    </div>
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);
