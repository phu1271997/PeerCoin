import React, { useEffect, useState } from 'react';
import { Gavel, Scale, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { AddressLabel } from '../components/AddressLabel';

interface AppealsProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, arg?: string) => void;
}

interface AppealRow {
  paper_id: string;
  appellant: string;
  stake: string;
  filed_at: string;
  resolved: boolean;
  overturned: boolean;
  resolution_status: string;
  new_avg: number;
  paperTitle?: string;
}

/**
 * Appeals — dashboard listing every appeal ever filed on this deployment.
 *
 * Data source: list_appeals(offset, limit) view — new in v0.3 core contract.
 * We enrich each row with the paper title via get_paper for readability.
 */
export const Appeals: React.FC<AppealsProps> = ({ account, onNavigate }) => {
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const client = makeClient(account || '0x0000000000000000000000000000000000000000');
        const res = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'list_appeals',
          args: [0, 100],
        }) as any;

        const items: AppealRow[] = Array.isArray(res?.items) ? res.items : [];

        // Enrich with paper title
        for (const it of items) {
          try {
            const p = await client.readContract({
              address: CONTRACT_ADDRESS,
              functionName: 'get_paper',
              args: [it.paper_id],
            }) as any;
            it.paperTitle = p?.title || '(untitled)';
          } catch {
            it.paperTitle = '(unavailable)';
          }
        }

        // Newest first
        items.sort((a, b) => parseInt(b.paper_id) - parseInt(a.paper_id));
        setAppeals(items);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [account]);

  const pending = appeals.filter((a) => !a.resolved).length;
  const overturned = appeals.filter((a) => a.resolved && a.overturned).length;
  const upheld = appeals.filter((a) => a.resolved && !a.overturned).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3">
        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
            <Gavel className="w-4 h-4" />
            <span>Appeal Court</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100">Adversarial Re-Jury Docket</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Every REJECT verdict on PeerCoin can be challenged by the paper author with a stake deposit. A second AI Jury runs
          against a <span className="text-amber-300 font-mono">distinct APPEAL canary token</span> with a prompt that instructs the LLM to
          steelman the appellant. Overturns are rare and expensive to lose — the ledger below is the court's public docket.
        </p>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <StatBox icon={<Clock className="w-4 h-4 text-amber-400" />} label="Pending" value={pending} />
          <StatBox icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} label="Overturned" value={overturned} />
          <StatBox icon={<XCircle className="w-4 h-4 text-rose-400" />} label="Upheld" value={upheld} />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400 mb-2" />
          Querying <code>list_appeals(0, 100)</code> from GenLayer studionet...
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300 font-mono">
          Error loading appeals: {error}
        </div>
      ) : appeals.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-sm space-y-2">
          <Gavel className="w-8 h-8 mx-auto text-slate-600" />
          <div>No appeals filed on this deployment yet.</div>
          <div className="text-xs text-slate-500">When an author challenges a REJECT verdict, the appeal will appear here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {appeals.map((a) => (
            <button
              key={a.paper_id}
              onClick={() => onNavigate('paper', a.paper_id)}
              className="w-full text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition group flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-[10px] text-slate-500 font-mono">#{a.paper_id}</span>
                  <StatusChip status={a.resolution_status} overturned={a.overturned} resolved={a.resolved} />
                </div>
                <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-amber-300 transition">
                  {a.paperTitle}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center space-x-2">
                  <span>Appellant:</span>
                  <AddressLabel address={a.appellant} />
                </div>
              </div>
              <div className="flex-shrink-0 text-right space-y-0.5">
                <div className="text-xs font-mono font-bold text-amber-300">
                  {(BigInt(a.stake || '0') / BigInt(10 ** 18)).toString()} GEN
                </div>
                <div className="text-[10px] text-slate-500 font-mono">stake</div>
                {a.resolved && (
                  <div className={`text-[10px] font-mono ${a.overturned ? 'text-emerald-400' : 'text-rose-400'}`}>
                    new avg {a.new_avg}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-2xl font-bold font-mono text-slate-100">{value}</div>
  </div>
);

const StatusChip: React.FC<{ status: string; overturned: boolean; resolved: boolean }> = ({ overturned, resolved }) => {
  if (!resolved) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
        <Clock className="w-2.5 h-2.5" />
        <span>PENDING</span>
      </span>
    );
  }
  if (overturned) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
        <Scale className="w-2.5 h-2.5" />
        <span>OVERTURNED</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
      <XCircle className="w-2.5 h-2.5" />
      <span>UPHELD</span>
    </span>
  );
};
