import React, { useEffect, useState } from 'react';
import { ArrowLeft, Gavel, AlertTriangle, Coins } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface FileAppealProps {
  paperId: string;
  account: `0x${string}` | null;
  onNavigate: (page: string, arg?: string) => void;
}

/**
 * FileAppeal — form the paper author uses to stake the appeal deposit.
 *
 * Contract requires:
 *   - caller == paper.author
 *   - paper.state == FAILED with ai_verdict == "REJECT"
 *   - now within paper.finalized_at + appeal_window_secs
 *   - value == author_stake * appeal_stake_multiplier (exact)
 *   - no prior appeal on this paper
 *
 * We read get_paper() + get_config() to compute the required stake and let the
 * user see the exact math before they sign. The transaction reverts on any
 * mismatch — value is refunded, we render the specific reason from the error.
 */
export const FileAppeal: React.FC<FileAppealProps> = ({ paperId, account, onNavigate }) => {
  const [paper, setPaper] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filing, setFiling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const client = makeClient(account || '0x0000000000000000000000000000000000000000');
        const [p, c] = await Promise.all([
          client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_paper', args: [paperId] }),
          client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_config', args: [] }),
        ]);
        setPaper(p);
        setCfg(c);
      } catch (e: any) {
        setStatusMsg(`Failed to load paper: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [paperId, account]);

  const handleFile = async () => {
    if (!account || !cfg) return;
    setFiling(true);
    setStatusMsg(null);
    try {
      const client = makeClient(account);
      const stakeWei = BigInt(cfg.appeal_stake_amount);
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'file_appeal',
        args: [paperId],
        value: stakeWei,
      }) as any;
      if (typeof tx === 'string') {
        await client.waitForTransactionReceipt({ hash: tx as any });
      }
      setStatusMsg('Appeal filed successfully. Redirecting...');
      setTimeout(() => onNavigate('paper', paperId), 1200);
    } catch (err: any) {
      setStatusMsg(`Failed to file appeal: ${err?.message || 'transaction reverted'}`);
    } finally {
      setFiling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        Loading paper #{paperId} from GenLayer studionet...
      </div>
    );
  }

  if (!paper || !cfg) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <div className="text-slate-100 font-bold">Paper #{paperId} not found</div>
        <div className="text-xs text-slate-400">{statusMsg || 'Contract read returned no data'}</div>
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
          Return to Preprints
        </button>
      </div>
    );
  }

  const isAuthor = account && account.toLowerCase() === paper.author.toLowerCase();
  // An ordinary REJECT lands in FINALIZED; only inconclusive/BORDERLINE runs
  // land in FAILED. Both are appealable so long as the verdict is REJECT.
  const isFailedReject =
    (paper.state === 'FINALIZED' || paper.state === 'FAILED') && paper.ai_verdict === 'REJECT';
  const alreadyAppealed = paper.appeal != null;

  const stakeGen = (BigInt(cfg.appeal_stake_amount) / BigInt(10 ** 18)).toString();
  const authorStakeGen = (BigInt(cfg.author_stake_amount) / BigInt(10 ** 18)).toString();
  const windowHours = Math.floor(parseInt(cfg.appeal_window_secs) / 3600);
  const bonusPct = (cfg.appeal_win_bonus_bps / 100).toFixed(1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('paper', paperId)}
        className="flex items-center space-x-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Paper #{paperId}</span>
      </button>

      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 shadow-2xl space-y-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <Gavel className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">File Appeal</h1>
            <p className="text-sm text-slate-400 mt-1">
              Challenge the AI Jury's REJECT verdict on <span className="text-teal-300 font-semibold">"{paper.title}"</span> by staking a deposit for an adversarial re-jury.
            </p>
          </div>
        </div>

        {/* Gating messages */}
        {!isAuthor && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Only the paper author (<code className="font-mono text-xs">{paper.author.slice(0, 12)}...</code>) may file an appeal. You are connected as a different wallet.</span>
          </div>
        )}
        {!isFailedReject && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Only a finalized paper with an <code className="font-mono">ai_verdict = REJECT</code> can be appealed. This paper is <code className="font-mono">{paper.state} / {paper.ai_verdict || '—'}</code>. BORDERLINE papers must be resubmitted, not appealed.</span>
          </div>
        )}
        {alreadyAppealed && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>An appeal has already been filed on this paper. Only one appeal is permitted per paper — the current appeal status is <code className="font-mono">{paper.appeal?.resolution_status}</code>.</span>
          </div>
        )}

        {/* Economics summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricBox
            label="Required stake"
            value={`${stakeGen} GEN`}
            sublabel={`${cfg.appeal_stake_multiplier}× author stake (${authorStakeGen} GEN)`}
            highlight
          />
          <MetricBox
            label="Appeal window"
            value={`~${windowHours}h`}
            sublabel="After original finalize"
          />
          <MetricBox
            label="Win bonus"
            value={`+${bonusPct}%`}
            sublabel="Of current bounty pool"
          />
        </div>

        {/* Rules panel */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="font-semibold text-slate-100 flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>How the appeal court works</span>
          </div>
          <ul className="space-y-2 list-none">
            <li>· If the adversarial re-jury OVERTURNS to ACCEPT — you get your <span className="font-mono text-emerald-400">{stakeGen} GEN</span> stake back + a <span className="font-mono text-emerald-400">{bonusPct}%</span> bonus from the bounty pool, and the paper's on-chain state flips to <code className="font-mono">FINALIZED</code>.</li>
            <li>· If the appeal is UPHELD — your entire <span className="font-mono text-rose-400">{stakeGen} GEN</span> stake is burned into the paper's bounty pool. No refund.</li>
            <li>· Reviewers who originally voted ACCEPT (marked misaligned by the wrong REJECT) get a make-good <span className="font-mono text-emerald-400">+8</span> reputation on overturn.</li>
            <li>· The adversarial jury uses a <span className="font-mono">distinct APPEAL canary token</span> — a replayed original-jury response cannot pass validation.</li>
            <li>· Anyone can call <code className="font-mono">resolve_appeal</code> once filed (gas paid by caller) — you don't have to resolve it yourself.</li>
          </ul>
        </div>

        {/* Sign button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 font-mono">
            The transaction sends <span className="text-amber-300 font-bold">{stakeGen} GEN</span> to the PeerCoin core contract.
          </div>
          <button
            onClick={handleFile}
            disabled={!account || !isAuthor || !isFailedReject || alreadyAppealed || filing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center space-x-2"
          >
            <Gavel className="w-4 h-4" />
            <span>{filing ? 'Signing tx...' : `Stake ${stakeGen} GEN & File Appeal`}</span>
          </button>
        </div>

        {statusMsg && (
          <p className="text-xs font-mono bg-slate-950 rounded-lg p-3 border border-slate-800 text-slate-200">{statusMsg}</p>
        )}
      </div>
    </div>
  );
};

const MetricBox: React.FC<{ label: string; value: string; sublabel: string; highlight?: boolean }> = ({ label, value, sublabel, highlight }) => (
  <div className={`p-4 rounded-xl border ${highlight ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">{label}</div>
    <div className={`text-lg font-bold font-mono ${highlight ? 'text-amber-300' : 'text-slate-100'}`}>{value}</div>
    <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>
  </div>
);
