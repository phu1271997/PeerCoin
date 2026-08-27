import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, ShieldCheck, ChevronRight, RefreshCw, Cpu, Coins, ExternalLink } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { PaperGridSkeleton } from '../components/PaperCardSkeleton';

interface HomeProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ account, onNavigate }) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [totalOnChain, setTotalOnChain] = useState<number>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchPapers();
  }, [account]);

  const fetchPapers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const client = makeClient(account || '0x0000000000000000000000000000000000000000');
      const res = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'list_papers',
        args: [0, 50],
      }) as any;

      if (res) {
        setTotalOnChain(typeof res.total === 'number' ? res.total : 0);
        if (Array.isArray(res.items)) {
          // Newest first: higher paper id at the top so recent seeds surface
          // and legacy demo papers with low ids sink to the bottom.
          const sorted = [...res.items].sort(
            (a, b) => parseInt(b.id || '0', 10) - parseInt(a.id || '0', 10),
          );
          setPapers(sorted);
        } else {
          setPapers([]);
        }
      }
    } catch (e: any) {
      console.error("Error fetching papers from GenLayer Studionet:", e);
      setFetchError(e?.message || "Could not connect to GenLayer Studionet RPC.");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = papers.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.field || '').toLowerCase().includes(search.toLowerCase());
    const matchesField = fieldFilter === 'ALL' || (p.field || '').toLowerCase() === fieldFilter.toLowerCase();
    return matchesSearch && matchesField;
  });

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/20 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>GenLayer Studionet Direct Sync</span>
            </div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight mb-4">
            Skin-in-the-game Peer Review with <span className="bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">AI Jury Consensus</span>
          </h2>
          <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
            Reviewers stake GEN to review preprints. GenLayer's decentralized AI jury reads the preprint and human reviews directly on-chain, rewarding aligned reviewers and slashing rogue reviews.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('submit')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition shadow-lg shadow-teal-500/25"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Submit Preprint</span>
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition"
            >
              <span>View Reviewer Leaderboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search preprints by title or field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {['ALL', 'cs', 'biology', 'econ', 'physics'].map((f) => (
            <button
              key={f}
              onClick={() => setFieldFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                fieldFilter === f
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}

          <button
            onClick={fetchPapers}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-teal-400 transition"
            title="Refresh Studionet Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          Studionet Sync Warning: {fetchError}
        </div>
      )}

      {/* Demo Mode banner — visible when connected but nothing on-chain yet */}
      {!loading && !fetchError && totalOnChain === 0 && account && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-100 mb-1">Demo Mode — seed the app first</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The contract is empty. Fund your wallet from Studio's Accounts panel, then follow <code className="text-teal-400 font-mono">scripts/seed.md</code> to publish one demo preprint plus two demo reviews. Total cost: 140 GEN, all recoverable via <code className="text-teal-400 font-mono">claim</code>.
            </p>
          </div>
          <a
            href="https://studio.genlayer.com/contracts"
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition"
          >
            <span>Studio Accounts</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Preprint Grid */}
      {loading ? (
        <div className="space-y-4">
          <div className="text-center text-slate-500 font-mono text-xs flex items-center justify-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>Querying `list_papers` on GenLayer Studionet ({CONTRACT_ADDRESS.slice(0, 10)}...)...</span>
          </div>
          <PaperGridSkeleton count={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
          <div className="text-slate-300 text-base font-semibold">
            No preprints published on Studionet yet ({totalOnChain} total on-chain).
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Click the button below to submit a new preprint, stake 100 GEN on GenLayer Studionet, and view the live created paper immediately!
          </p>
          <button
            onClick={() => onNavigate('submit')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 hover:opacity-90 transition"
          >
            Submit First Preprint on Studionet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((paper) => {
            const isFinalized = paper.state === 'FINALIZED';
            const isFailed = paper.state === 'FAILED';
            const isAccept = paper.ai_verdict === 'ACCEPT';

            return (
              <div
                key={paper.id}
                onClick={() => onNavigate('paper', paper.id)}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition cursor-pointer flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 text-xs font-mono font-semibold uppercase">
                        {paper.field}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">#{paper.id}</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isFinalized
                        ? isAccept ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : isFailed
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isFinalized ? `AI: ${paper.ai_verdict}` : paper.state}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-teal-300 transition line-clamp-2 mb-2">
                    {paper.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {paper.abstract}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-slate-500">Bounty Pool: </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {(BigInt(paper.bounty_pool || '0') / BigInt(10**18)).toString()} GEN
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Reviews: </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {paper.reviewer_ids?.length || 0}
                      </span>
                    </div>
                  </div>

                  <span className="text-teal-400 group-hover:translate-x-1 transition flex items-center font-medium">
                    View Paper #{paper.id} <ChevronRight className="w-4 h-4 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
