# Changelog

All notable changes to the PeerCoin project will be documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Milestones are grouped by the classification used in the [GenLayer Builder milestone rubric](../gen-rules/04-upgrade_project.md).

## [Unreleased]

### Milestone Phase 2 — Actor Insights: Analytics Dashboard + Profile Pages (2026-08-28)
**Type:** Major feature (Loại 3) — two new full pages that expose entirely new views over existing on-chain data.
**No contract redeploy required.** Pure client aggregation over `list_papers`, `get_review`, and `ReputationLedger.score`.

**New: Analytics Dashboard (`frontend/src/pages/Analytics.tsx`, 300+ LOC).**
Network-wide view aggregating every paper + every reviewer:
- 4 KPIs at the top: total preprints (+ finalized count), distinct reviewers (+ alignment rate), author stake escrowed (+ bounty pool total), AI verdicts issued (+ ACCEPT/REJECT split).
- Verdict distribution chart — horizontal bar breakdown of ACCEPT / REJECT / BORDERLINE with percentages, rendered inline as SVG-free CSS bars (no chart library, keeps the bundle at 800 kB pre-gzip).
- Preprints by academic field — sorted horizontal bar chart with counts.
- Average AI rigor score by verdict — side-by-side comparison of ACCEPT-avg vs REJECT-avg with sample counts.
- Most active authors — top-5 leaderboard with click-through to their profile page.
- "Data sources" footer with direct explorer links to `PeerCoinCore.list_papers()` and `ReputationLedger.score()` so viewers can independently reproduce every number.

**New: Profile Page (`frontend/src/pages/Profile.tsx`, 260+ LOC).**
Polymorphic actor page — one URL for any address. Discovers everything on-chain about that identity:
- Classifier badge — Author / Reviewer / Author & Reviewer / Observer — computed from actual on-chain activity, not self-declared.
- Reputation tier badge with 5 tiers: MISALIGNED (score < 0), NEWCOMER (0), CONTRIBUTOR (1–9), TRUSTED (10–24), ESTABLISHED (≥25).
- "That's you" self-badge when connected wallet matches.
- 4 stats: reputation score, papers authored, reviews submitted, alignment rate.
- "As Author" section — every paper by this address with stake, state, and AI verdict badge; click-through to paper detail.
- "As Reviewer" section — every review by this address with verdict, confidence, and Aligned (+5) / Misaligned (-3) outcome badge.

**Navigation wiring — click any address, land on its profile:**
- Header nav: new Analytics tab (BarChart3 icon).
- PaperDetail: author address is now a button linking to the author's profile, with copy-to-clipboard as a secondary icon (was a single ambiguous copy button).
- PaperDetail: each reviewer row's address is now a button linking to that reviewer's profile.
- Leaderboard: entire row is a button linking to the ranked reviewer's profile.
- Analytics: "Most active authors" rows link to the author's profile.

**Router:**
- `App.tsx` now handles `analytics` and `profile` routes. `handleNavigate` extended to accept either `paperId` or `address` as the second arg depending on target page.

### Milestone Phase 1 — UX Overhaul & Discovery Bundle (2026-08-27)
**Type:** Major feature (Loại 3) + UX overhaul (Loại 7) + new contract functionality exposed (Loại 8).
**No contract redeploy required.** All work is frontend + newly-exposed access to a previously dead-code contract method.

**Landing page rewrite — five new sections above the preprint grid:**
- Live stats bar (preprints on-chain, distinct reviewers, GEN staked in system, finalized) computed from `list_papers` in one aggregate pass.
- "The Problem" section — 3 cards on the scientific replication crisis, unpaid anonymous review, and preprint gatekeeping gap.
- "How It Works" — 4-step numbered flow (submit → review → jury → claim) plus a 3-column worked example tracing GEN through pass / fail / borderline branches with exact numbers.
- "Why GenLayer" — 3 tech cards each showing the exact non-deterministic API call (`gl.nondet.web.render`, `gl.nondet.exec_prompt`, `gl.vm.run_nondet`).
- "How to Participate" role tabs (Author / Reviewer / Trigger) — each with per-role cost, 6 numbered steps, and a scoped CTA.
- FAQ (6 items) covering slashing risk, prompt injection defense, borderline handling, reputation storage, LLM-error fallback, and `sponsor_bounty`.
- Resources footer with contract explorer links + GitHub companion docs.

**Sponsor Bounty page (`/frontend/src/pages/Sponsor.tsx`) — new UI caller for a previously dead-code method.**
The `sponsor_bounty(paper_id)` payable method has existed on `PeerCoinCore` since v0.1 but had **zero UI callers** — an Explorer Gate 1 gap (any write method must be reachable from the app). The new page lets any wallet top up an OPEN/REVIEWING paper's bounty pool with quick-pick amounts (1/5/10/25 GEN) and full-decimal input. Displays current pool inline. Fail-fast on closed papers.

**Discovery & filter improvements:**
- State filter chips (ALL / OPEN / REVIEWING / FINALIZED / FAILED) with live counts per state.
- Newest-first paper sort so freshly-seeded records surface at the top of the grid.
- Explorer link icon on every paper card so viewers can verify on-chain state without leaving the grid.
- Copy-to-clipboard on author address in PaperDetail (silent-fail on blocked clipboard, 1.5s check-mark confirmation).

**Wallet & routing infrastructure:**
- Replaced deprecated `window.ethereum.selectedAddress` with `eth_accounts` + `accountsChanged`/`chainChanged` listeners so connection state updates on wallet switch or chain switch without a manual refresh.
- Added `frontend/vercel.json` with SPA rewrite `/(.*) → /` so refreshing on any state-driven path never 404s through Vercel's CDN.
- Added `.env*` to gitignore to prevent leaking Vercel's OIDC token.

**SEO / social share:**
- `index.html` now ships full Open Graph + Twitter card meta tags with 1024×1024 logo, meta description, theme color, and PNG favicon so links to the app render a proper preview card in Discord / Twitter / Slack.

**Explorer submission prep:**
- Added `frontend/public/logo.svg` + `logo-1024.png` + `logo-512.png` (document with folded corner + checkmark badge, teal→emerald gradient matching app accent). Meets Portal spec (PNG, 128–2048 px, < 2 MB).
- Added `submission/EXPLORER_SUBMISSION.md` — full Portal Explorer draft with character-counted one-liner (149/180), description (992/1000), expected verification outcome (449/500), category tag mapping to contract methods, and 7-step seeding procedure.

### Redeployment on studionet (v0.8) — hardening bundle activated
- **Deployed v0.8** `PeerCoinCore` at `0xCf08ec64514C131bFBEe21A1319C0D58630258D9`, activating the reviewer-feedback fixes (bypass removal, per-reviewer validator agreement, verdict-to-threshold consistency). Reputation ledger `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` unchanged; `set_core` re-linked.
- **Verified** post-deploy via `get_config()` — all constructor args correct, `next_paper_id: 0` fresh state.
- **Synced** addresses across `.env.example`, `frontend/.env`, `frontend/src/lib/client.ts`, `README.md`, `scripts/deploy.md`, `scripts/seed.md`, `ARCHITECTURE.md`.
- **Redeployed** frontend to Vercel prod (no code change vs previous — public method signatures stable — just points at the new contract).

### Reviewer-feedback hardening (v0.8) — authorization + consensus + tests
Portal reviewer requested: *"Please remove or strictly authorize the diagnostic and bypass write methods, and ensure validators agree on every jury field that controls slashing, rewards, and reputation. Also enforce verdict-to-threshold consistency and add lifecycle tests for settlement and refunds before funds can move."* Full response below.

**Removed the `submit_paper_v2` bypass and every anonymous `diag_*` method.** Those methods let any caller write papers with zero stake and fake metadata — a real authorization hole. Replaced with a single admin-gated pair:
- `admin_probe_state_write()` — deployer-only, requires `next_paper_id == 0` (contract must be untouched), does a bump-then-reset so the id space is preserved for real users.
- `admin_probe_now_ts()` — read-only view, no state effect, harmless if left ungated.

**Extended `validator_fn` to enforce agreement on every field that drives settlement.** Prior to this change the validator only compared verdict and score-avg tolerance; a malicious leader could still poison the `reviewer_alignment` map to slash the wrong reviewers or grant a `+5` reputation bump to an accomplice. New checks:
- Verdict-to-threshold consistency at BOTH validator time and settlement time — contract now derives verdict from `(rigor + novelty + reproducibility) / 3 >= pass_threshold` and ignores whatever the LLM stated. A leader claiming `verdict=ACCEPT` with `avg=30` is rejected pre-consensus.
- Per-reviewer `reviewer_alignment` agreement — for every `reviewer_id` in `review_snapshot`, leader's aligned/not-aligned must match validator's independent computation.
- `reviewer_alignment` map shape check — must be a dict, not a list or string.
- Alignment entries for unknown `reviewer_id`s are silently dropped in the settle path — leader cannot slash or reward non-reviewers.

**Extracted three pure helpers** so validation logic is directly unit-testable and used identically by validator and settlement paths:
- `_derive_verdict(rigor, novelty, repro, pass_thresh)` → `(verdict, avg, is_borderline)`
- `_validate_llm_output(parsed, pass_thresh)` → `(ok, reason)` — canary + shape + consistency
- `_settle_reviewers(alignment_map, r_ids, r_ids_set)` → `(aligned_ids, misaligned_ids)`

**Added 27 lifecycle + settlement tests** (`tests/test_lifecycle.py`) — total suite now 42 tests, all green. Covers:
- verdict-to-threshold consistency (5 tests): accept/reject/borderline edges around the threshold
- LLM output validation (10 tests): canary present/missing/wrong, verdict consistent/inconsistent, invalid tokens, malformed alignment, non-dict inputs, string scores
- Reviewer settlement (5 tests): all-aligned, all-misaligned, missing keys, unknown-reviewer injection defense, non-dict alignment
- Full lifecycle scenarios (7 tests): happy path pass with mixed reviewers (correct payouts + reputation), fail path with author stake forfeited, FAILED state refunds everyone with no reputation change, borderline treated as FAILED with full refund, double-claim guards, unknown-reviewer cannot claim, verdict-inconsistency-with-scores triggers FAILED with full refund

### Redeployment on studionet (v0.7) — timestamp API fallback fix
- **Fourth root cause found** — visible for the first time in the Studio GenVM Execution panel:
  ```
  AttributeError: module 'genlayer.gl.vm' has no attribute 'get_timestamp'
  ```
  The v0.3 rewrite replaced `gl.block.timestamp` with `gl.vm.get_timestamp()` per `sdk.genlayer.com` docs, but the CURRENT deployed studionet runtime doesn't expose `get_timestamp()` either — docs are ahead of runtime.
- **Deployed v0.7** `PeerCoinCore` at `0x8Ffd4Abda597A1A90cB0564aB121E0cb66AE9f0E`. Reputation ledger `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` unchanged.
- **Fixed** `_now_ts()` with a four-step fallback chain:
  1. `gl.vm.get_timestamp()` — future runtime
  2. `gl.message.datetime` — string field documented on gl.message
  3. `gl.message.raw` dict inspection
  4. `bigint(0)` safety net — **never raises**, so timestamp is no longer a revert source. Review-window logic degrades to always-open-until-min-reviewers, which is safe for the pre-mainnet demo.
- **Timestamp bug history across the debug cycle:**
  - v0.1 / v0.2: `gl.block.timestamp` — AttributeError (fixed in v0.3)
  - v0.3 - v0.6: `gl.vm.get_timestamp()` — AttributeError (fixed HERE in v0.7)
- All lazy imports of `datetime.datetime` are inside each fallback branch, avoiding a top-level `import datetime` that some GenVM builds prohibit.

### Redeployment on studionet (v0.5) — decorator migration fix (THE fix)
- **Third root cause found and confirmed** — the current studionet runtime renamed `allow_storage` → `allow` (accessible as `gl.storage.allow`) in v0.3.0 per the migration guide at sdk.genlayer.com. The star-import still exposed `allow_storage` as a name so schema loading and view methods worked, but on the STATE-WRITE path the old-alias decorator no-oped: dataclass instances weren't actually marked storage-compatible, and any write of `Paper(...)` into `TreeMap[str, Paper]` inside a payable method reverted silently. Neither the u256 fix (v0.4) nor the timestamp fix (v0.3) could have caught this on their own.
- **Verified via three non-payable diagnostic methods** (`diag_bump_id`, `diag_write_seen_url`, `diag_write_paper`) added to v0.5: all three returned `SUCCESS` on the deployed contract, proving simple state writes, TreeMap writes, AND Paper dataclass storage all work when the decorator is applied via the try/except resolver — before v0.5 the same Paper write path reverted.
- **Deployed v0.5** `PeerCoinCore` at `0x0db9824dE6E9fAcfCe13701123b9e3c95C4AD38E`. Reputation ledger `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` unchanged.
- **Added** at module scope:
  ```python
  try:
      _storage_allow = allow_storage         # v0.2 name via star-import
  except NameError:
      _storage_allow = gl.storage.allow      # v0.3+ name
  ```
  and applied `@_storage_allow` to both `Paper` and `Review`.
- **Added** diagnostic methods `diag_bump_id`, `diag_write_seen_url(url)`, `diag_write_paper(key)` — non-payable, cheap probes that bisect the write path. Kept in the contract as a permanent safety net for future redeploys.
- **Total GEN permanently stuck across the four-version debug cycle: 770 GEN** (220 v0.1 + 330 v0.2 + 110 v0.3 + 110 v0.4). No admin withdraw path in any core; chalked up to debug cost.

### Redeployment on studionet (v0.4) — u256/bigint arithmetic bug fixed
- **Second root cause found** (distinct from the v0.3 timestamp fix): `gl.message.value` is typed `u256` (Annotated[int, size=32, unsigned]) in the current studionet runtime, not `bigint`. Subtracting a stored `bigint` from a `u256` raises TypeError, and on studionet a TypeError inside a `@gl.public.write.payable` method reverts the tx WITHOUT refunding `msg.value`. Verified against sdk.genlayer.com api reference: *"You cannot directly subtract a stored bigint from gl.message.value. Convert explicitly."* This bug shipped in every prior version — an extra 110 GEN got stuck in the v0.3 core `0xad494561EF28b7853778036a02DbADf190465732` when the user tested it, proving the timestamp fix alone was necessary-but-not-sufficient.
- **Deployed v0.4** `PeerCoinCore` at `0xEcBb6500a9582A470Cd6f8A5BBd825Bf3d735Ae9`. Reputation ledger `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` unchanged; `set_core` re-linked.
- **Added** `_msg_value_bi()` helper: `bigint(int(gl.message.value))`. `submit_paper`, `submit_review`, `sponsor_bounty` all coerce `msg.value` once at entry and operate purely in bigint space afterward.
- **Verified** post-deploy via `get_config()` — stakes, thresholds, rep_addr, next_paper_id all correct.
- **Total GEN permanently stuck across the debug cycle: 660 GEN** (220 v0.1 + 330 v0.2 + 110 v0.3). No admin withdraw path in any core — chalked up to debug cost.

### Redeployment on studionet (v0.3) — critical timestamp bug fixed
- **Root cause found**: every submit_paper / finalize / claim tx on v0.1 and v0.2 was reverting inside the contract because `gl.block.timestamp` does not exist in the current studionet Python runtime (correct API is `gl.vm.get_timestamp()` returning a timezone-aware datetime). Verified against `sdk.genlayer.com/main/_static/ai/api.txt`. Studionet marked those txs FINALIZED but did not refund `msg.value`, so 550 GEN got stuck across the two failed cores (330 GEN in v0.2 `0x12f6…2710`, 220 GEN in v0.1 `0x7E4f…e346`). No admin withdraw path — permanently lost.
- **Deployed v0.3** `PeerCoinCore` at `0xad494561EF28b7853778036a02DbADf190465732` with the timestamp fix and the new `get_config()` diagnostic view. Reputation ledger at `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` is unchanged; `set_core` re-linked to the new core.
- **Verified** post-deploy via `get_config()` — stakes, thresholds, reputation address, and `next_paper_id: 0` all correct.
- **Fixed** Submit.tsx false-positive success screen — now polls `list_papers.total` before/after submit and only marks success when the total actually advances; on unchanged total, surfaces a specific error naming likely causes (duplicate URL, URL validation, length limits, insufficient stake) so the user can fix inputs before retrying.
- **Fixed** PaperDetail.tsx loading state — `finally` block previously kept spinner spinning on successful retries. Now clears loading on both success and final-failure paths; retry count bumped 3 → 5 (with 3s interval) to give ~15s for slow finalize propagation.
- **Synced** addresses across `.env.example`, `frontend/.env`, `frontend/src/lib/client.ts`, `README.md`, `scripts/deploy.md`, `scripts/seed.md`, `ARCHITECTURE.md`.
- **Redeployed** frontend to Vercel prod.

### Redeployment on studionet (v0.2)
- **Deployed** fresh `ReputationLedger` on studionet at `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` (replaces `0x5cBf00F1effeae8A5062c3029eda8E826b5C7ebE`).
- **Deployed** upgraded `PeerCoinCore` on studionet at `0x12f6F425d2C050A6B153a46DEB062D3AE6c22710` (replaces `0x7E4fA4381C1AaB44d3182c3e484576e0B6Dfe346`). Ships the 3-lens AI jury + prompt injection canary + input hardening bundle.
- **Linked** the new ledger to the new core via `set_core(0x12f6F425d2C050A6B153a46DEB062D3AE6c22710)`.
- **Synced** addresses across `.env.example`, `frontend/.env`, `frontend/src/lib/client.ts`, `README.md`, `scripts/deploy.md`, `scripts/seed.md`, and `ARCHITECTURE.md`.
- **Redeployed** frontend to Vercel prod so live app talks to the new contracts.

### Documentation Overhaul milestone
- **Added** [ARCHITECTURE.md](ARCHITECTURE.md) — contract topology, paper state machine, non-deterministic consensus sequence diagram, storage schema table, failure-mode table. All diagrams in Mermaid so they render on GitHub.
- **Added** [ECONOMICS.md](ECONOMICS.md) — stake/reward flow-of-funds diagrams for the pass / fail / FAILED branches, a worked 4-reviewer example, breakeven math for honest reviewers, incentive claims, redeploy vs adjust guidance, open economic questions.
- **Added** [SECURITY.md](SECURITY.md) — threat model, 10 concrete attack surfaces addressed (prompt injection through rendered URLs, verdict schema-only consensus, GenVM storage traps R14/R18/R19, address representation drift, pull-payment safety, double-claim / re-entry, reviewer double-submit, duplicate URL, bounded inputs, URL scheme allowlist), frontend security notes (no `VITE_` private keys, `wallet_switchEthereumChain` on connect, chain id sourced from SDK).
- **Added** [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, commit style, contract-change checklist, deploy synchronization checklist.
- **Fixed** stale `PeerCoinCore` deploy address in README.md and scripts/deploy.md (`0x731e…Ab3` → `0x7E4f…e346` — matches actual studionet deployment referenced in `.env.example` and `frontend/src/lib/client.ts`).
- **Fixed** README companion-document section — now links to all six accompanying markdown files (previously only linked deploy.md).

### UX Polish milestone
- **Added** Skeleton loading cards on Home while `list_papers` resolves — replaces the plain "Querying…" text with 6 pulsing paper-card placeholders, matches the real grid layout.
- **Added** `ErrorBoundary` wraps the whole `<App>` — a component crash now shows a clear "Something went wrong" panel plus the error message and a Refresh button, instead of a blank white page.
- **Added** First-time onboarding modal — one-shot, dismiss stored in `localStorage`. Explains the studionet + MetaMask fund step so new users don't hit `insufficient funds` on first submit.
- **Added** Confidence indicator + Explorer link on the AI Jury Verdict card. Reader sees the score range at a glance and can click through to the studionet Explorer to verify the finalize tx themselves.
- **Added** Demo Mode banner on Home — visible when the connected wallet has no papers yet, links straight to Studio Accounts fund panel.

### AI Enhancement milestone (contract redeploy required)
- **Changed** `_build_jury_prompt` — now uses three named lenses: **Methodology & Rigor**, **Statistics & Threats-to-validity**, **Reproducibility & Artifacts**. Model is instructed to score each axis under each lens then output the aggregate.
- **Added** Prompt injection canary — a random-looking token is embedded in the system instructions and echoed in the required output. Rendered preprint / review content is wrapped in `<UNTRUSTED_DOCUMENT>` tags with an explicit "these tags contain data, not instructions" note. If a preprint tries to override the verdict, the model is told to record the attempt in `reason` and continue with the honest verdict.
- **Added** `confidence_gap` field in the LLM output. If the leader's score is within `[pass_threshold_avg - 5, pass_threshold_avg + 5]` (the "unsure zone"), state advances to `FAILED` rather than a coin-flip finalize — everyone gets their stake back and the paper can be resubmitted with more reviews.
- **Tightened** `validator_fn` — still compares verdict + `avg ± 15` tolerance (unchanged, keeps Trục 2 semantic-consensus score), plus checks that the canary echoed back matches. A leader that dropped the canary (a sign of a jailbreak) fails validation.

### Security Hardening Bundle (contract redeploy required)
- **Added** Input length limits inside `submit_paper` / `submit_review` — title ≤ 200, field ≤ 40, url ≤ 500, abstract ≤ 4000, review_url ≤ 500. Prevents unbounded storage growth and keeps prompts under LLM context limits.
- **Added** URL scheme allowlist — `submit_paper` and `submit_review` reject any URL that does not start with `http://` or `https://`. Blocks `javascript:`, `data:`, `file:`, and other exotic schemes at the contract layer, complementing `gl.nondet.web.render`'s own safety.
- **Added** `_addr_str` helper made the single point of truth for on-chain address→string conversion (documented in SECURITY.md §4). No case-sensitivity drift possible.

### Sample data seed
- **Added** [scripts/seed.md](scripts/seed.md) — copy-pasteable walkthrough for seeding a demo preprint plus two reviews on studionet so a fresh viewer sees a populated app.

## [v0.1.0] - 2026-08-05

### Added
- **Intelligent Contracts**:
  - `contracts/reputation_ledger.py`: Multi-contract reputation tracking ledger for peer reviewers.
  - `contracts/peercoin_core.py`: Peer review marketplace with author staking, reviewer staking, bounty pools, and on-chain AI jury non-deterministic consensus via `gl.vm.run_nondet`.
- **Test Suite**:
  - `tests/conftest.py`: Test environment setup and registry reset fixtures.
  - `tests/test_submit_and_review.py`: Unit tests for paper submission, stake rules, and review constraints.
  - `tests/test_ai_jury.py`: Mock AI jury installer tests using `sim_installMocks`.
  - `tests/test_edge_cases.py`: LLM JSON response extraction and prompt formatting unit tests.
- **Frontend App**:
  - React 18, Vite, TypeScript, TailwindCSS frontend connecting via `genlayer-js` and MetaMask to GenLayer `studionet`.
  - Pages for preprint browsing, author paper submission, peer review submission, consensus execution, and reviewer reputation leaderboards.
- **Deployment & Documentation**:
  - Detailed `README.md` covering replication crisis problem statement, GenLayer USP, step-by-step deployment on `studionet`, and video walkthrough outline.
  - `scripts/deploy.md` deployment guide for GenLayer Studio.
