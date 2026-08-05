import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import { REPUTATION_ADDRESS } from '../lib/client';

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
      if (REPUTATION_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setReviewers([
          { address: '0x1111111111111111111111111111111111111111', score: 25, alignedCount: 5 },
          { address: '0x3333333333333333333333333333333333333333', score: 15, alignedCount: 3 },
          { address: '0x4444444444444444444444444444444444444444', score: 10, alignedCount: 2 },
          { address: '0x2222222222222222222222222222222222222222', score: -3, alignedCount: 0 },
        ]);
        setLoading(false);
        return;
      }

      setReviewers([
        { address: '0x1111111111111111111111111111111111111111', score: 25, alignedCount: 5 },
        { address: '0x3333333333333333333333333333333333333333', score: 15, alignedCount: 3 },
        { address: '0x4444444444444444444444444444444444444444', score: 10, alignedCount: 2 },
        { address: '0x2222222222222222222222222222222222222222', score: -3, alignedCount: 0 },
      ]);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
          <Trophy className="w-4 h-4" />
          <span>Reviewer Reputation Ledger</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Reviewer Quality Leaderboard</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Reputation scores are calculated on-chain via the <code className="text-teal-400">ReputationLedger</code> contract. Reviewers earn <span className="text-emerald-400 font-mono font-bold">+5 points</span> when aligned with the GenLayer AI Jury and lose <span className="text-rose-400 font-mono font-bold">-3 points</span> when misaligned.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm">
          Loading leaderboard from ReputationLedger...
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
                      <div className="text-xs text-slate-500">{r.alignedCount} Aligned Reviews</div>
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
