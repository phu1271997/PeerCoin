import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle, Search, Filter, ShieldCheck, ChevronRight, RefreshCw,
  Cpu, Coins, ExternalLink, TrendingDown, BookOpen, Users, Brain,
  Globe, Vote, FileText, Play, Award, Landmark, Sparkles,
  ArrowRight, CheckCircle2, XCircle, HelpCircle, Scale,
} from 'lucide-react';
import { makeClient, CONTRACT_ADDRESS } from '../lib/client';
import { PaperGridSkeleton } from '../components/PaperCardSkeleton';

interface HomeProps {
  account: `0x${string}` | null;
  onNavigate: (page: string, paperId?: string) => void;
}

type Role = 'author' | 'reviewer' | 'trigger';

export const Home: React.FC<HomeProps> = ({ account, onNavigate }) => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [totalOnChain, setTotalOnChain] = useState<number>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('author');

  useEffect(() => {
    fetchPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const sorted = [...res.items].sort(
            (a, b) => parseInt(b.id || '0', 10) - parseInt(a.id || '0', 10),
          );
          setPapers(sorted);
        } else {
          setPapers([]);
        }
      }
    } catch (e: any) {
      console.error('Error fetching papers from GenLayer Studionet:', e);
      setFetchError(e?.message || 'Could not connect to GenLayer Studionet RPC.');
      setPapers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = papers.filter((p) => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.field || '').toLowerCase().includes(search.toLowerCase());
    const matchesField = fieldFilter === 'ALL' || (p.field || '').toLowerCase() === fieldFilter.toLowerCase();
    return matchesSearch && matchesField;
  });

  const stats = useMemo(() => {
    const reviewerSet = new Set<string>();
    let stakedWei = 0n;
    let finalized = 0;
    for (const p of papers) {
      if (Array.isArray(p.reviewer_ids)) {
        for (const r of p.reviewer_ids) reviewerSet.add(r);
      }
      try {
        stakedWei += BigInt(p.author_stake || '0');
        stakedWei += BigInt(p.bounty_pool || '0');
      } catch { /* ignore */ }
      if (p.state === 'FINALIZED') finalized += 1;
    }
    const stakedGen = Number(stakedWei / BigInt(10 ** 18));
    return {
      preprints: totalOnChain,
      reviewers: reviewerSet.size,
      stakedGen,
      finalized,
    };
  }, [papers, totalOnChain]);

  return (
    <div className="space-y-16">
      {/* ==================== HERO ==================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 border border-teal-500/20 p-8 md:p-12 shadow-2xl">
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Live on GenLayer Studionet</span>
            </div>
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              <span>Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight mb-4">
            Skin-in-the-game Peer Review with{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">
              AI Jury Consensus
            </span>
          </h2>
          <p className="text-slate-300 text-base md:text-lg mb-6 leading-relaxed max-w-2xl">
            Authors stake <span className="text-teal-400 font-mono font-semibold">100 GEN</span> to
            publish. Reviewers stake <span className="text-teal-400 font-mono font-semibold">20 GEN</span> per
            verdict. A decentralized AI jury reads the preprint on-chain, rewards aligned reviewers,
            slashes the misaligned. Reputation is on-chain, immutable, auditable.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('submit')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition shadow-lg shadow-teal-500/25"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Submit Preprint</span>
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition"
            >
              <span>How It Works</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition"
            >
              <Award className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>
          </div>
        </div>

        {/* Decorative blob */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* ==================== LIVE STATS BAR ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5 text-teal-400" />} label="Preprints on-chain" value={String(stats.preprints)} />
        <StatCard icon={<Users className="w-5 h-5 text-emerald-400" />} label="Distinct reviewers" value={String(stats.reviewers)} />
        <StatCard icon={<Coins className="w-5 h-5 text-amber-400" />} label="GEN staked in system" value={stats.stakedGen ? `${stats.stakedGen.toLocaleString()} GEN` : '—'} />
        <StatCard icon={<ShieldCheck className="w-5 h-5 text-teal-400" />} label="Finalized by AI jury" value={String(stats.finalized)} />
      </div>

      {/* ==================== THE PROBLEM ==================== */}
      <section id="problem" className="space-y-8">
        <SectionHeader
          tag="The Problem"
          title="Scientific peer review is broken"
          subtitle="Modern research faces three compounding failures. PeerCoin addresses all three at the protocol layer."
          tone="rose"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProblemCard
            icon={<TrendingDown className="w-6 h-6 text-rose-400" />}
            title="Replication crisis"
            body="Over 70% of published findings fail independent replication attempts. Reviewers who let flawed methods through pay no price; authors who overstate results face no downside."
          />
          <ProblemCard
            icon={<BookOpen className="w-6 h-6 text-rose-400" />}
            title="Slow, unpaid, anonymous review"
            body="Traditional peer review takes 2–6 months, is unpaid, and hides reviewer identity. Zero financial incentive for rigor. Zero accountability when a bad paper passes."
          />
          <ProblemCard
            icon={<Globe className="w-6 h-6 text-rose-400" />}
            title="Preprints have no filter"
            body="arXiv, bioRxiv, OSF host millions of preprints with no gatekeeping. Journalists, policymakers, and other researchers cannot tell rigorous work from unverified claims at scale."
          />
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="space-y-8">
        <SectionHeader
          tag="How It Works"
          title="Four steps from preprint to on-chain verdict"
          subtitle="Every step is a real transaction on GenLayer studionet. Try it yourself with any funded MetaMask wallet."
          tone="teal"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FlowStep
            step={1}
            icon={<FileText className="w-6 h-6 text-teal-400" />}
            title="Author stakes & publishes"
            body="Author stakes 100 GEN + optional bounty topup. Contract stores the preprint URL, title, field, abstract, and marks state = OPEN."
            highlight="submit_paper()"
          />
          <FlowStep
            step={2}
            icon={<Users className="w-6 h-6 text-teal-400" />}
            title="Reviewers stake & vote"
            body="Each reviewer stakes 20 GEN, picks a verdict (ACCEPT / WEAK_ACCEPT / WEAK_REJECT / REJECT), and links to their written rationale. State advances to REVIEWING."
            highlight="submit_review()"
          />
          <FlowStep
            step={3}
            icon={<Brain className="w-6 h-6 text-teal-400" />}
            title="AI jury reaches consensus"
            body="Anyone triggers finalize(). A non-deterministic block fetches every URL, runs a 3-lens LLM jury, validators re-run independently, consensus passes only if verdict + scores + per-reviewer alignment all match."
            highlight="finalize()"
          />
          <FlowStep
            step={4}
            icon={<Coins className="w-6 h-6 text-teal-400" />}
            title="Aligned reviewers claim"
            body="Aligned reviewers claim stake + share of misaligned stakes + bounty pool. Reputation ledger bumps aligned +5, misaligned -3. Failing author forfeits stake."
            highlight="claim()"
          />
        </div>

        {/* Flow-of-funds explainer */}
        <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-4">
          <h4 className="text-sm font-semibold text-teal-400 uppercase tracking-wider flex items-center space-x-2">
            <Scale className="w-4 h-4" />
            <span>Follow the GEN — worked example</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <ExampleColumn
              tone="emerald"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              header="Paper passes (avg ≥ 60)"
              lines={[
                'Author stakes 100 GEN + 10 bounty topup = 110 in',
                'Reviewer A (aligned, ACCEPT) stakes 20',
                'Reviewer B (aligned, ACCEPT) stakes 20',
                'Reviewer C (misaligned, REJECT) stakes 20 → forfeited',
                'Pool = 10 + 20 misaligned = 30. Split 2 aligned = 15 each.',
                'Author: gets 100 back. A: 20 + 15 = 35. B: 35. C: 0.',
              ]}
            />
            <ExampleColumn
              tone="rose"
              icon={<XCircle className="w-4 h-4 text-rose-400" />}
              header="Paper fails (avg < 60)"
              lines={[
                'Author stakes 100 GEN → forfeited to bounty',
                'Reviewer A (aligned, REJECT) stakes 20',
                'Reviewer B (misaligned, ACCEPT) stakes 20 → forfeited',
                'Pool = 100 forfeit + 20 misaligned = 120. Alone aligned takes all.',
                'Author: 0. A: 20 + 120 = 140. B: 0.',
              ]}
            />
            <ExampleColumn
              tone="amber"
              icon={<HelpCircle className="w-4 h-4 text-amber-400" />}
              header="Borderline / FAILED"
              lines={[
                'AI avg within ±5 of threshold → BORDERLINE → FAILED',
                'OR validator consensus rejects LLM output → FAILED',
                'No slashing. No reputation change.',
                'Everyone refunds full stake via claim().',
                'Paper can be resubmitted with more reviews.',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ==================== WHY GENLAYER ==================== */}
      <section id="why-genlayer" className="space-y-8">
        <SectionHeader
          tag="Why GenLayer"
          title="What Solidity cannot do"
          subtitle="Every capability below is native to GenLayer's Optimistic Democracy consensus. Traditional smart contracts would need centralized oracles for each."
          tone="teal"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TechCard
            icon={<Globe className="w-6 h-6 text-teal-400" />}
            title="On-chain web fetch"
            body="gl.nondet.web.render reads the preprint PDF and every review document directly on validator nodes. No Chainlink, no centralized oracle."
            code="rendered = gl.nondet.web.render(url)"
          />
          <TechCard
            icon={<Brain className="w-6 h-6 text-teal-400" />}
            title="LLM at the consensus layer"
            body="gl.nondet.exec_prompt runs an LLM inference on every validator. Each validator scores rigor / novelty / reproducibility independently through a 3-lens rubric."
            code="resp = gl.nondet.exec_prompt(prompt)"
          />
          <TechCard
            icon={<Vote className="w-6 h-6 text-teal-400" />}
            title="Semantic validator agreement"
            body="gl.vm.run_nondet compares verdicts by meaning, not by string equality. Two validators writing different rationale text still reach consensus if the verdict + alignment map match."
            code="run_nondet(leader_fn, validator_fn)"
          />
        </div>
      </section>

      {/* ==================== HOW TO SUBMIT (ROLE TABS) ==================== */}
      <section id="how-to-submit" className="space-y-8">
        <SectionHeader
          tag="How To Participate"
          title="Pick your role, follow the steps"
          subtitle="You need MetaMask on GenLayer Studio Network (chainId 61999) with GEN funded from Studio's Accounts panel."
          tone="emerald"
        />

        <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-wrap gap-2">
            <RoleTab id="author" active={activeRole} onClick={setActiveRole} icon={<FileText className="w-4 h-4" />} label="As Author" />
            <RoleTab id="reviewer" active={activeRole} onClick={setActiveRole} icon={<Users className="w-4 h-4" />} label="As Reviewer" />
            <RoleTab id="trigger" active={activeRole} onClick={setActiveRole} icon={<Play className="w-4 h-4" />} label="As AI Jury Trigger" />
          </div>

          {activeRole === 'author' && (
            <RoleSteps
              cost="100 GEN stake + optional bounty topup"
              steps={[
                ['Connect MetaMask', 'Click Connect MetaMask (top right). App auto-adds GenLayer Studio Network if needed.'],
                ['Fund the wallet', 'Open studio.genlayer.com Accounts panel. Transfer at least 110 GEN from any pre-funded Studio account to your MetaMask address.'],
                ['Submit preprint', 'Click Submit Preprint. Fill title, field, public preprint URL (arXiv, bioRxiv, OSF), abstract. Optional bounty topup increases reviewer payout.'],
                ['Sign the transaction', 'Confirm in MetaMask. Contract deposits 100 GEN + topup and marks the paper OPEN.'],
                ['Wait for reviews and AI jury', 'Reviewers stake to critique. Once ≥1 review is in, anyone can trigger the AI jury.'],
                ['Claim if you passed', 'FINALIZED with avg score ≥ 60 → click Claim to get your stake back. Below threshold → stake forfeited to reviewers.'],
              ]}
              cta={{ label: 'Submit a preprint now', action: () => onNavigate('submit') }}
            />
          )}

          {activeRole === 'reviewer' && (
            <RoleSteps
              cost="20 GEN stake per review"
              steps={[
                ['Fund your wallet', 'Need ≥20 GEN per review on studionet. Transfer from Studio Accounts panel.'],
                ['Open a paper', 'From the Home grid, open any paper in OPEN or REVIEWING state.'],
                ['Write your review', 'Publish your written rationale to a public URL (GitHub gist works). The AI jury will render this URL as part of consensus.'],
                ['Submit Human Review', 'Pick a verdict (ACCEPT / WEAK_ACCEPT / WEAK_REJECT / REJECT), confidence 0–100, paste the review URL. Sign to stake 20 GEN.'],
                ['Wait for the AI jury', 'When someone triggers finalize(), your alignment is decided by validator consensus.'],
                ['Claim if aligned', 'Aligned → 20 GEN back + share of misaligned stakes + share of bounty pool + 5 reputation. Misaligned → stake forfeited, -3 reputation.'],
              ]}
              cta={{ label: 'Browse open papers', action: () => document.getElementById('preprint-grid')?.scrollIntoView({ behavior: 'smooth' }) }}
            />
          )}

          {activeRole === 'trigger' && (
            <RoleSteps
              cost="Free (just gas)"
              steps={[
                ['Find a ready paper', 'A paper is finalize-ready when it has ≥1 review OR the 24h review window has elapsed.'],
                ['Click Trigger AI Jury', 'From the paper detail page. Sign the transaction (no stake, just gas).'],
                ['Wait 30–90s for consensus', 'Validators fetch every URL, run the LLM jury, agree on verdict + per-reviewer alignment.'],
                ['Verify on Explorer', 'Once state = FINALIZED, click the tx link to see GENVM RESULT: SUCCESS on explorer-studio.genlayer.com.'],
              ]}
              cta={{ label: 'Browse papers awaiting jury', action: () => document.getElementById('preprint-grid')?.scrollIntoView({ behavior: 'smooth' }) }}
            />
          )}
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="space-y-8">
        <SectionHeader
          tag="FAQ"
          title="Common questions"
          subtitle="Short answers to what most people ask before staking."
          tone="teal"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FaqCard
            q="Is my GEN really at risk?"
            a="Yes. Contract holds it under pull-payment escrow. If the AI jury says your paper failed the rigor threshold, your author stake is forfeited to the aligned-reviewer pool. If your review is misaligned with the jury verdict, your reviewer stake is forfeited too."
          />
          <FaqCard
            q="What stops the LLM from being manipulated?"
            a="Prompt injection canary — the jury prompt embeds a secret token that must be echoed back. Preprint text is wrapped in UNTRUSTED_DOCUMENT tags. Validators re-run the jury independently and must agree on verdict, scores within tolerance, AND every reviewer's alignment flag."
          />
          <FaqCard
            q="What if the AI jury is wrong?"
            a="Borderline verdicts (score within ±5 of threshold) go to FAILED state automatically — everyone refunds, no slashing, no reputation change. The paper can be resubmitted with more reviews. Non-borderline verdicts are final and irreversible for that paper submission."
          />
          <FaqCard
            q="Where is my reputation stored?"
            a="A separate ReputationLedger contract. Aligned reviews add +5, misaligned reviews subtract 3. Only PeerCoinCore can bump the ledger. Scores are queryable by anyone and never reset."
          />
          <FaqCard
            q="What if the LLM output is unparseable?"
            a="The finalize tx marks the paper as FAILED. All stakes refund via claim(). No reputation is changed. This is the fail-safe for LLM API errors, model outages, or malformed JSON."
          />
          <FaqCard
            q="Can I sponsor a paper's bounty?"
            a="Yes — a sponsor_bounty(paper_id) method accepts payable value from anyone while the paper is still OPEN or REVIEWING. Increases the pool for aligned reviewers, no other effect."
          />
        </div>
      </section>

      {/* ==================== PREPRINT GRID (existing) ==================== */}
      <section id="preprint-grid" className="space-y-6">
        <SectionHeader
          tag="Live Registry"
          title="On-chain preprints"
          subtitle={`${totalOnChain} preprint${totalOnChain === 1 ? '' : 's'} on studionet. Newest first.`}
          tone="teal"
        />

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

        {!loading && !fetchError && totalOnChain === 0 && account && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex-shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-100 mb-1">Demo Mode — no preprints yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Contract is empty. Fund your wallet from Studio's Accounts panel, then click Submit Preprint. Total cost per paper: 100 GEN stake + optional bounty, all recoverable via <code className="text-teal-400 font-mono">claim</code> if the AI jury approves.
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

        {loading ? (
          <div className="space-y-4">
            <div className="text-center text-slate-500 font-mono text-xs flex items-center justify-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>Querying list_papers on GenLayer Studionet ({CONTRACT_ADDRESS.slice(0, 10)}...)...</span>
            </div>
            <PaperGridSkeleton count={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
            <div className="text-slate-300 text-base font-semibold">
              No preprints match your search ({totalOnChain} total on-chain).
            </div>
            <button
              onClick={() => onNavigate('submit')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 hover:opacity-90 transition"
            >
              Submit the first preprint
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
                          {(BigInt(paper.bounty_pool || '0') / BigInt(10 ** 18)).toString()} GEN
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
      </section>

      {/* ==================== RESOURCES FOOTER SECTION ==================== */}
      <section className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950/20 to-slate-900 border border-slate-800 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Landmark className="w-4 h-4" />
              <span>On-chain</span>
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-3">Verify everything yourself</h4>
            <div className="space-y-2 text-xs">
              <ResourceLink label="PeerCoinCore contract" url={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`} />
              <ResourceLink label="ReputationLedger contract" url="https://explorer-studio.genlayer.com/address/0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E" />
              <ResourceLink label="GenLayer Studio Explorer" url="https://explorer-studio.genlayer.com" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Get started</span>
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-3">First time using GenLayer?</h4>
            <div className="space-y-2 text-xs">
              <ResourceLink label="Open GenLayer Studio (fund wallet)" url="https://studio.genlayer.com/contracts" />
              <ResourceLink label="GenLayer Portal (Builder track)" url="https://portal.genlayer.foundation" />
              <ResourceLink label="What is GenLayer?" url="https://docs.genlayer.com" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <FileText className="w-4 h-4" />
              <span>Source</span>
            </div>
            <h4 className="text-lg font-bold text-slate-100 mb-3">Read the code</h4>
            <div className="space-y-2 text-xs">
              <ResourceLink label="GitHub repo" url="https://github.com/phu1271997/PeerCoin" />
              <ResourceLink label="ARCHITECTURE.md" url="https://github.com/phu1271997/PeerCoin/blob/main/ARCHITECTURE.md" />
              <ResourceLink label="ECONOMICS.md" url="https://github.com/phu1271997/PeerCoin/blob/main/ECONOMICS.md" />
              <ResourceLink label="SECURITY.md" url="https://github.com/phu1271997/PeerCoin/blob/main/SECURITY.md" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ================================================================= *
 * Reusable presentational components — kept in-file to keep the      *
 * landing page as a single, easily-audited unit for reviewers.       *
 * ================================================================= */

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">{icon}</div>
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-xl font-bold font-mono text-slate-100">{value}</div>
    </div>
  </div>
);

const SectionHeader: React.FC<{ tag: string; title: string; subtitle: string; tone: 'teal' | 'emerald' | 'rose' }> = ({ tag, title, subtitle, tone }) => {
  const toneClass = {
    teal: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  }[tone];
  return (
    <div className="space-y-3">
      <div className={`inline-block px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${toneClass}`}>
        {tag}
      </div>
      <h3 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">{subtitle}</p>
    </div>
  );
};

const ProblemCard: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition space-y-3">
    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 w-fit">{icon}</div>
    <h4 className="text-base font-bold text-slate-100">{title}</h4>
    <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
  </div>
);

const FlowStep: React.FC<{ step: number; icon: React.ReactNode; title: string; body: string; highlight: string }> = ({ step, icon, title, body, highlight }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition space-y-3 flex flex-col">
    <div className="flex items-center justify-between">
      <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">{icon}</div>
      <span className="text-3xl font-black font-mono text-slate-800">0{step}</span>
    </div>
    <h4 className="text-base font-bold text-slate-100">{title}</h4>
    <p className="text-xs text-slate-400 leading-relaxed flex-1">{body}</p>
    <div className="pt-3 border-t border-slate-800">
      <code className="text-[11px] text-teal-400 font-mono">{highlight}</code>
    </div>
  </div>
);

const ExampleColumn: React.FC<{ tone: 'emerald' | 'rose' | 'amber'; icon: React.ReactNode; header: string; lines: string[] }> = ({ tone, icon, header, lines }) => {
  const border = { emerald: 'border-emerald-500/30', rose: 'border-rose-500/30', amber: 'border-amber-500/30' }[tone];
  return (
    <div className={`p-4 rounded-xl bg-slate-950/60 border ${border} space-y-2`}>
      <div className="flex items-center space-x-2 font-semibold text-slate-200 text-xs">
        {icon}
        <span>{header}</span>
      </div>
      <ul className="space-y-1 text-slate-400 text-[11px] font-mono leading-relaxed">
        {lines.map((l, i) => (
          <li key={i} className="flex items-start space-x-1">
            <span className="text-slate-600">·</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TechCard: React.FC<{ icon: React.ReactNode; title: string; body: string; code: string }> = ({ icon, title, body, code }) => (
  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition space-y-3">
    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 w-fit">{icon}</div>
    <h4 className="text-base font-bold text-slate-100">{title}</h4>
    <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
      <code className="text-[11px] text-teal-400 font-mono whitespace-nowrap">{code}</code>
    </div>
  </div>
);

const RoleTab: React.FC<{ id: Role; active: Role; onClick: (r: Role) => void; icon: React.ReactNode; label: string }> = ({ id, active, onClick, icon, label }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
      active === id
        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const RoleSteps: React.FC<{ cost: string; steps: [string, string][]; cta: { label: string; action: () => void } }> = ({ cost, steps, cta }) => (
  <div className="space-y-5">
    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
      <div className="text-xs text-slate-400">Cost per action:</div>
      <div className="text-xs font-mono font-semibold text-amber-400">{cost}</div>
    </div>
    <ol className="space-y-3">
      {steps.map(([title, body], i) => (
        <li key={i} className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold text-xs flex items-center justify-center font-mono">
            {i + 1}
          </div>
          <div className="pt-0.5">
            <div className="text-sm font-semibold text-slate-100">{title}</div>
            <div className="text-xs text-slate-400 leading-relaxed mt-0.5">{body}</div>
          </div>
        </li>
      ))}
    </ol>
    <button
      onClick={cta.action}
      className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 transition"
    >
      <span>{cta.label}</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

const FaqCard: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
    <div className="flex items-start space-x-2">
      <HelpCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm font-semibold text-slate-100">{q}</div>
    </div>
    <p className="text-xs text-slate-400 leading-relaxed pl-6">{a}</p>
  </div>
);

const ResourceLink: React.FC<{ label: string; url: string }> = ({ label, url }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="flex items-center justify-between text-slate-400 hover:text-teal-400 transition group"
  >
    <span>{label}</span>
    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
  </a>
);
