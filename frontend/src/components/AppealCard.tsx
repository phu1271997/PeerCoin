import React, { useState } from 'react';
import { Gavel, Scale, CheckCircle2, XCircle, Clock, Play, AlertTriangle } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface AppealCardProps {
  paperId: string;
  appeal: {
    appellant: string;
    stake: string;
    filed_at: string;
    resolved: boolean;
    overturned: boolean;
    resolution_status: string;   // PENDING | OVERTURNED | UPHELD
    new_avg: number;
    new_reason: string;
    claimed: boolean;
  };
  account: `0x${string}` | null;
  onResolved?: () => void;
}

/**
 * AppealCard — renders the appeal status on a paper that has been contested.
 *
 * Three visual states:
 *   PENDING     → yellow "Adversarial Re-Jury pending" panel with a Resolve
 *                 Appeal button (any wallet can trigger it — gas paid by caller).
 *   OVERTURNED  → green "Verdict Overturned" panel with the appeal jury's
 *                 reasoning and refund/bonus math.
 *   UPHELD      → red "Verdict Upheld" panel — appeal stake burned to bounty.
 */
export const AppealCard: React.FC<AppealCardProps> = ({ paperId, appeal, account, onResolved }) => {
  const [resolving, setResolving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const stakeGen = (BigInt(appeal.stake || '0') / BigInt(10 ** 18)).toString();

  const handleResolve = async () => {
    if (!account) return;
    setResolving(true);
    setStatusMsg('Running adversarial re-jury on GenLayer studionet — this triggers a fresh LLM consensus with a distinct APPEAL canary. May take 30-60s.');
    try {
      const client = makeClient(account);
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'resolve_appeal',
        args: [paperId],
        value: 0n,
      }) as any;
      if (typeof tx === 'string') {
        await client.waitForTransactionReceipt({ hash: tx as any });
      }
      setStatusMsg('Adversarial re-jury complete. Refreshing...');
      onResolved?.();
    } catch (err: any) {
      setStatusMsg(`Resolve failed: ${err?.message || 'transaction error'}`);
    } finally {
      setResolving(false);
    }
  };

  // PENDING
  if (!appeal.resolved) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-200">Appeal Filed — Adversarial Re-Jury Pending</h3>
              <p className="text-xs text-amber-300/70">
                Appellant staked <span className="font-mono font-bold">{stakeGen} GEN</span> to overturn the REJECT verdict.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-semibold uppercase">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The <code className="text-amber-300 font-mono">resolve_appeal</code> transaction re-runs the paper through a
          <span className="text-amber-300 font-semibold"> different LLM prompt</span> that instructs the jury to steelman the appellant and hunt for
          weaknesses in the original REJECT reason. A <span className="font-mono">distinct APPEAL canary token</span> guards the
          response so a replayed original-jury response cannot sneak an overturn through.
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-mono">
            Filed at: block ts {appeal.filed_at || '?'} · by {(appeal.appellant || '').slice(0, 10)}...
          </div>
          <button
            onClick={handleResolve}
            disabled={!account || resolving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:opacity-90 transition disabled:opacity-50 inline-flex items-center space-x-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{resolving ? 'Running adversarial jury...' : 'Trigger Adversarial Re-Jury'}</span>
          </button>
        </div>

        {statusMsg && (
          <p className="text-xs font-mono text-amber-300 bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
            {statusMsg}
          </p>
        )}
      </div>
    );
  }

  // OVERTURNED
  if (appeal.overturned) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-200">Verdict Overturned on Appeal</h3>
              <p className="text-xs text-emerald-300/70">
                Adversarial re-jury flipped this from REJECT to ACCEPT (new avg <span className="font-mono font-bold">{appeal.new_avg}</span>).
              </p>
            </div>
          </div>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold uppercase">
            <Scale className="w-3 h-3" />
            <span>Overturned</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">Appeal jury reasoning</div>
          {appeal.new_reason || '(no reason provided)'}
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Appellant refund</div>
            <div className="text-emerald-300 font-mono font-bold">{stakeGen} GEN + 10% bounty bonus</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Claim status</div>
            <div className="font-mono font-bold text-slate-200">{appeal.claimed ? 'Claimed' : 'Available via claim_appeal'}</div>
          </div>
        </div>
      </div>
    );
  }

  // UPHELD
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/40 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-200">Appeal Upheld — Original REJECT Stands</h3>
            <p className="text-xs text-rose-300/70">
              Adversarial re-jury saw the same defects. Appeal stake of <span className="font-mono font-bold">{stakeGen} GEN</span> burned into bounty pool.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-semibold uppercase">
          <AlertTriangle className="w-3 h-3" />
          <span>Upheld</span>
        </span>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-rose-500/20 text-xs text-slate-300 leading-relaxed">
        <div className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold mb-1">Appeal jury reasoning</div>
        {appeal.new_reason || '(no reason provided)'}
      </div>
    </div>
  );
};
