import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Cpu } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS, REPUTATION_ADDRESS } from '../lib/client';

interface LeaderboardProps {
  account: `0x${string}` | null;
  onNavigate: (page: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ account }) => {
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [account]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const client = makeClient(account || '0x0000000000000000000000000000000000000000');
      
      // 1. Fetch papers to discover active reviewers
      const res = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'list_papers',
        args: [0, 100],
      }) as any;

      const reviewerMap = new Map<string, { address: string; score: number; alignedCount: number }>();

      if (res && Array.isArray(res.items)) {
        for (const p of res.items) {
          if (Array.isArray(p.reviewer_ids)) {
            for (const rid of p.reviewer_ids) {
              if (!reviewerMap.has(rid)) {
                reviewerMap.set(rid, { address: rid, score: 0, alignedCount: 0 });
              }
            }
          }
        }
      }

      // 2. Query ReputationLedger contract on studionet for each reviewer
      const reviewerList = Array.from(reviewerMap.values());
      for (const r of reviewerList) {
        try {
          const score = await client.readContract({
            address: REPUTATION_ADDRESS,
            functionName: 'score',
            args: [r.address],
          });
          r.score = typeof score === 'number' ? score : parseInt(String(score || 0));
        } catch (e) {
          console.error(`Error querying reputation for ${r.address}:`, e);
        }
      }

      reviewerList.sort((a, b) => b.score - a.score);
      setReviewers(reviewerList);
    } catch (e) {
      console.error(e);
      setReviewers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <Trophy className="w-4 h-4" />
            <span>Reviewer Reputation Ledger</span>
          </div>
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>Ledger: {REPUTATION_ADDRESS.slice(0, 8)}...</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100">Reviewer Quality Leaderboard</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Reputation scores are calculated on-chain via the <code className="text-teal-400 font-mono">ReputationLedger</code> contract. Reviewers earn <span className="text-emerald-400 font-mono font-bold">+5 points</span> when aligned with the GenLayer AI Jury and lose <span className="text-rose-400 font-mono font-bold">-3 points</span> when misaligned.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm">
          Querying `ReputationLedger` on GenLayer Studionet...
        </div>
      ) : reviewers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          No reviewer reputation scores recorded on Studionet yet. Submit reviews and trigger AI Jury adjudication to earn points!
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="divide-y divide-slate-800">
            {reviewers.map((r, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <div key={idx} className="py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isTop1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      isTop2 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                      isTop3 ? 'bg-amber-700/20 text-amber-600 border border-amber-600/40' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {isTop1 ? <Trophy className="w-4 h-4" /> : isTop2 ? <Medal className="w-4 h-4" /> : isTop3 ? <Star className="w-4 h-4" /> : `#${idx + 1}`}
                    </div>

                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-200">{r.address}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold font-mono ${
                      r.score > 0 ? 'text-emerald-400' : r.score < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {r.score > 0 ? `+${r.score}` : r.score} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
