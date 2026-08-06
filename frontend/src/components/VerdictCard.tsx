import React from 'react';
import { CheckCircle2, XCircle, Award, Scale, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface VerdictCardProps {
  verdict: string;
  rigor: number;
  novelty: number;
  reproducibility: number;
  reason: string;
  passThreshold?: number;
  txHash?: string | null;
}

const EXPLORER_BASE = 'https://genlayer-explorer.vercel.app';

function confidenceLabel(avg: number, threshold: number): { text: string; tone: string } {
  const gap = avg - threshold;
  if (gap >= 15) return { text: 'HIGH confidence pass', tone: 'text-emerald-300' };
  if (gap >= 5) return { text: 'moderate confidence pass', tone: 'text-emerald-400' };
  if (gap >= -5) return { text: 'borderline — near threshold', tone: 'text-amber-400' };
  if (gap >= -15) return { text: 'moderate confidence reject', tone: 'text-rose-400' };
  return { text: 'HIGH confidence reject', tone: 'text-rose-300' };
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  verdict,
  rigor,
  novelty,
  reproducibility,
  reason,
  passThreshold = 60,
  txHash,
}) => {
  const isAccept = verdict === 'ACCEPT';
  const avgScore = Math.round((rigor + novelty + reproducibility) / 3);
  const conf = confidenceLabel(avgScore, passThreshold);

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
            <div className={`text-[11px] font-mono uppercase tracking-wider ${conf.tone}`}>
              {conf.text}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Average Rigor Score</div>
          <div className="text-3xl font-extrabold font-mono text-slate-100">{avgScore}<span className="text-lg text-slate-500">/100</span></div>
          <div className="text-[11px] text-slate-500 font-mono">threshold: {passThreshold}</div>
        </div>
      </div>

      {/* Threshold bar */}
      <div className="mb-6">
        <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${isAccept ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-amber-500'}`}
            style={{ width: `${Math.max(0, Math.min(100, avgScore))}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-slate-300"
            style={{ left: `${passThreshold}%` }}
            title={`pass threshold: ${passThreshold}`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>0</span>
          <span>threshold {passThreshold}</span>
          <span>100</span>
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
        <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2 flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>AI Jury On-Chain Rationale</span>
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
          {reason || 'No detailed rationale provided.'}
        </p>
      </div>

      {txHash && (
        <div className="mt-4 flex justify-end">
          <a
            href={`${EXPLORER_BASE}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-teal-400 hover:underline font-mono"
          >
            <span>Verify finalize tx on studionet Explorer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
