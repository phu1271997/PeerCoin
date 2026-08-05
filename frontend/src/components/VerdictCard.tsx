import React from 'react';
import { CheckCircle2, XCircle, Award, Scale, BookOpen } from 'lucide-react';

interface VerdictCardProps {
  verdict: string;
  rigor: number;
  novelty: number;
  reproducibility: number;
  reason: string;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  verdict,
  rigor,
  novelty,
  reproducibility,
  reason,
}) => {
  const isAccept = verdict === 'ACCEPT';
  const avgScore = Math.round((rigor + novelty + reproducibility) / 3);

  return (
    <div className={`p-6 rounded-2xl border ${
      isAccept
        ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/30'
        : 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-500/30'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {isAccept ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
          )}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              GenLayer AI Jury Verdict
            </div>
            <div className={`text-2xl font-bold ${isAccept ? 'text-emerald-400' : 'text-rose-400'}`}>
              {verdict}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Rigor Score</div>
          <div className="text-3xl font-extrabold font-mono text-slate-100">{avgScore}/100</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Scale className="w-4 h-4 text-teal-400" />
            <span>Rigor</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-200">{rigor}/100</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Novelty</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-200">{novelty}/100</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Reproducibility</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-200">{reproducibility}/100</div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
          AI Jury On-Chain Rationale
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
          {reason || 'No detailed rationale provided.'}
        </p>
      </div>
    </div>
  );
};
