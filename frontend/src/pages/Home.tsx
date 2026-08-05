import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, ShieldCheck, ChevronRight } from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';

interface HomeProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ account, onNavigate }) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');

  useEffect(() => {
    fetchPapers();
  }, [account]);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setPapers([
          {
            id: '0',
            title: 'Zero-Knowledge Proofs for Autonomous AI Agent Consensus',
            field: 'cs',
            author: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            url: 'https://arxiv.org/abs/2401.00001',
            abstract: 'We present a novel protocol integrating cryptographic ZK-rollups with Optimistic Democracy AI consensus to verify non-deterministic AI agent execution.',
            bounty_pool: '500000000000000000000',
            state: 'FINALIZED',
            reviewer_ids: ['0x111', '0x222', '0x333'],
            ai_verdict: 'ACCEPT',
            ai_rigor: 88,
            ai_novelty: 92,
            ai_reproduc: 85,
            ai_reason: 'Methodology is mathematically sound and reproducibility artifacts are publicly hosted on GitHub.',
          },
          {
            id: '1',
            title: 'Empirical Analysis of LLM Hallucinations in On-Chain Oracles',
            field: 'biology',
            author: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            url: 'https://biorxiv.org/content/10.1101/2024.01.002',
            abstract: 'Evaluating multi-validator LLM consensus against single-agent oracle feeds across 500 benchmarked Web3 adjudications.',
            bounty_pool: '200000000000000000000',
            state: 'REVIEWING',
            reviewer_ids: ['0x111', '0x444'],
            ai_verdict: '',
            ai_rigor: 0,
            ai_novelty: 0,
            ai_reproduc: 0,
            ai_reason: '',
          }
        ]);
        setLoading(false);
        return;
      }

      const client = makeClient(account || '0x0000000000000000000000000000000000000000');
      const res = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'list_papers',
        args: [0, 50],
      }) as any;

      if (res && res.items) {
        setPapers(res.items);
      }
    } catch (e) {
      console.error("Error fetching papers:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = papers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                          p.field.toLowerCase().includes(search.toLowerCase());
    const matchesField = fieldFilter === 'ALL' || p.field.toLowerCase() === fieldFilter.toLowerCase();
    return matchesSearch && matchesField;
  });

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/20 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>On-Chain Peer Review Economy</span>
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

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
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
        </div>
      </div>

      {/* Preprint Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-sm">
          Loading preprints from GenLayer studionet...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm mb-4">No preprints found matching your query.</p>
          <button
            onClick={() => onNavigate('submit')}
            className="px-4 py-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/30 transition"
          >
            Be the first author to submit
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
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 text-xs font-mono font-semibold uppercase">
                      {paper.field}
                    </span>
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
                    View Paper <ChevronRight className="w-4 h-4 ml-0.5" />
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
