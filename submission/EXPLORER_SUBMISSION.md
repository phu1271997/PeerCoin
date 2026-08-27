# GENLAYER PROJECT EXPLORER — SUBMISSION DRAFT

**Project:** PeerCoin · **Prepared:** 2026-08-25 · **Status: DO NOT SUBMIT YET (see blockers)**

---

## ⛔ BLOCKERS BEFORE SUBMIT

| # | Blocker | Owner | How to fix |
|---|---|---|---|
| B1 | Projects contribution not confirmed accepted. Explorer requires ≥ 1 accepted Projects submission first. | Peter | Check portal.genlayer.foundation dashboard. If not accepted → submit Projects first, wait, then Explorer. |
| B2 | On-chain state has only 1 OPEN paper with junk data ("jh" / "hjh jj jh j jh"). Reviewer opens the app, sees nothing meaningful. **Gate 2 fail.** | Peter | Run seed procedure below (~420 GEN, ~30 min including finalize waits). |

Both blockers must clear before submitting.

---

## SEEDING PROCEDURE (fix Gate 2)

**Prerequisite:** MetaMask on studionet, wallet `0x3ceAaaBDdF16d1E05d51fB5E93C86e11d4E5F5Bd` (contract admin) or any wallet funded from Studio Accounts panel. Need **≥ 420 GEN** for the three-record seed (100 author + 2×20 reviewer per paper × 3 papers = 420 GEN; all recoverable via `claim` except the misaligned reviewer's stake per paper).

### Record A — ACCEPT verdict (positive)

Use a real high-quality preprint URL. Suggested: `https://arxiv.org/abs/2401.04088` (Mixtral of Experts — well-cited).

1. Live app → Submit Preprint.
2. Title: `Mixtral of Experts — Sparse Mixture-of-Experts Language Model`
3. Field: `cs`
4. URL: `https://arxiv.org/abs/2401.04088`
5. Abstract: `Mixtral 8x7B is a sparse mixture-of-experts language model, matching or outperforming Llama 2 70B and GPT-3.5 on most benchmarks.`
6. Bounty topup: `10`
7. Submit & sign (100 + 10 = 110 GEN).
8. Wait for tx receipt, note new paper id (call it `A_ID`).
9. Switch to a **second** wallet, connect. Submit Review on paper `A_ID`: verdict `ACCEPT`, confidence `85`, review URL `https://gist.github.com/<your-user>/<any-real-gist-with-positive-review-text>`. Stake 20 GEN.
10. Switch to a **third** wallet. Submit Review on paper `A_ID`: verdict `ACCEPT`, confidence `80`, review URL same domain gist. Stake 20 GEN.
11. Any wallet → PaperDetail → "Trigger AI Jury". Wait 30–90s. State should move to FINALIZED with `ai_verdict: ACCEPT`.
12. Wallets 2 and 3 → PaperDetail → "Claim Stake + Bounty". Each recovers 20 + share of 10 bounty pool. Author (wallet 1) → "Claim" → recovers 100 GEN.

### Record B — REJECT verdict (negative)

Use a URL that renders as low-content or clearly not a rigorous preprint. Suggested: `https://example.com/notapaper` OR any short blog page.

1. Submit Preprint: title `Placeholder Draft`, field `cs`, URL `https://example.com/notapaper`, abstract `Draft placeholder — sparse content for demo of negative verdict path.`, bounty 0.
2. Note paper id `B_ID`.
3. Wallet 2 → Submit Review on `B_ID`: verdict `REJECT`, confidence 90, review URL a gist explaining why. Stake 20.
4. Wallet 3 → Submit Review on `B_ID`: verdict `ACCEPT`, confidence 60, review URL any gist. Stake 20. (Deliberately misaligned.)
5. Trigger AI Jury. AI should REJECT.
6. Author cannot claim (stake forfeited). Wallet 2 claims 20 + share of forfeit (20 misaligned + 100 author = 120 pool). Wallet 3 cannot claim (misaligned).

### Record C — completed claim flow (optional)

Records A and B already show a completed claim flow. Skip unless you want a third card.

### Verify seed

Open live URL in **incognito, no wallet connected**. You should see all 3 paper cards, at least one with `AI: ACCEPT` badge, one with `AI: REJECT`. Leaderboard should list at least 2 reviewer addresses with non-zero scores.

---

## Project name
PeerCoin

## Primary category
**Dispute Resolution**

Reasoning: PeerCoin adjudicates a subjective quality dispute between an author's claim ("this paper deserves publication") and reviewers' counter-claims, with money on the line. This matches GenLayer's own positioning as an "adjudication layer".
Rejected `AI & Agents` (too generic — every project is AI-powered, tag does not disambiguate) and `Governance` (no protocol governance, no voting on rules).

## Category tags
- **Category tag 1: Evidence Assessment** — `submit_paper` takes a preprint URL, `submit_review` takes a review-document URL. `finalize()` calls `gl.nondet.web.render` on every URL and evaluates the rendered evidence through a 3-lens rubric. This is the first thing every user does.
- **Category tag 2: Escrow Claims** — Author stake + reviewer stakes + bounty pool are held by the contract until finalize. `claim()` releases funds conditional on the AI verdict: aligned reviewers get stake + share, misaligned get nothing, failing author forfeits stake.

Rejected `Moderation Appeals` (no takedown/appeal flow), `License Claims` (no license terms), `Appeal Review` (borderline verdicts refund instead of triggering a second-round jury), `Jury Selection` (GenLayer selects validators — the "AI jury" naming is UX, not app-level validator selection).

## Logo
- `frontend/public/logo-1024.png` (1024×1024, 864 KB, PNG) — **upload this**
- `frontend/public/logo-512.png` (512×512, 232 KB, PNG) — backup if Portal rejects the 1024
- Source: `frontend/public/logo.svg`
- Concept: Document sheet with folded corner (the preprint) + checkmark badge (peer-reviewed / verified). Teal→emerald gradient matches app accent (`tailwind teal-400 → emerald-500`).

## One-liner (149 chars / cap 180)
```
Peer review with real stakes: authors and reviewers stake GEN, an on-chain AI jury reads the preprint, rewards aligned reviewers, slashes rogue ones.
```

## Description (992 chars / cap 1000)
```
PeerCoin turns peer review into a skin-in-the-game market. Author stakes 100 GEN to publish a preprint URL. Reviewers stake 20 GEN with a verdict (ACCEPT / WEAK_ACCEPT / WEAK_REJECT / REJECT) and a link to their rationale.

Anyone triggers finalize(). A non-deterministic block fetches the preprint and reviews with gl.nondet.web.render, runs a three-lens LLM jury (methodology, statistics, reproducibility), and returns scores plus a per-reviewer alignment map. Validators re-run the jury; consensus passes only if the verdict, score averages within tolerance, and every reviewer's aligned flag all match.

Aligned reviewers claim their stake plus a share of misaligned stakes and the bounty pool, and earn +5 on the ReputationLedger. Misaligned reviewers lose stake and 3 reputation. A failing author forfeits stake.

For editors and researchers wanting an accountable filter over open preprints. Solidity cannot fetch a PDF, run an LLM, or reach semantic consensus on a subjective verdict.
```

## How to try it

**Prerequisites**
- MetaMask (browser extension) installed.
- ~150 GEN on your MetaMask address on GenLayer Studio Network (chainId 61999). Transfer from a pre-funded Studio account via https://studio.genlayer.com/contracts → Accounts panel. **Do NOT use the testnet faucet — it funds testnet, not studionet.**
- To claim + trigger a full round from scratch you need ~140 GEN (100 author stake + 20 reviewer stake × 2), all recoverable via `claim` on aligned outcomes.

**Step 1 — Connect MetaMask.**
Click "Connect MetaMask" (top right). The app will add or switch to GenLayer Studio Network automatically. Approve the switch in MetaMask.

**Step 2 — Browse existing preprints.**
Home page lists all seeded preprints. Each card shows field, state (OPEN / REVIEWING / FINALIZED / FAILED), bounty pool, and — for FINALIZED papers — the AI verdict.

**Step 3 — Open a FINALIZED paper.**
Click any card marked "AI: ACCEPT" or "AI: REJECT". You see the full "AI Jury Verdict" panel: verdict, average score vs threshold bar, three sub-scores (rigor / novelty / reproducibility), and the validator-consensus rationale. Each human reviewer row is tagged Aligned (+5) or Misaligned (-3).

**Step 4 — (optional) Submit your own preprint.**
Home → Submit Preprint. Fill title, field, URL (must be `http://` or `https://`), abstract. The default bounty topup is 10 GEN. Total deposit = 110 GEN. Sign in MetaMask, wait ~15s for FINALIZED state, and the app routes you to your new paper.

**Step 5 — (optional) Review a paper.**
From a paper detail page (state OPEN or REVIEWING) → "Submit Human Review". Pick a verdict, confidence, and a review-document URL (a public gist works). Stake 20 GEN.

**Step 6 — (optional) Trigger the AI jury.**
Once a paper has ≥ 1 review, click "Trigger AI Jury". Wait 30–90s while validators fetch the preprint, run the LLM jury, and reach consensus. State advances to FINALIZED; if the LLM output fails validation the paper goes to FAILED and everyone can refund via Claim.

**Step 7 — Claim.**
On a FINALIZED paper, aligned reviewers and passing authors click "Claim Stake + Bounty" to withdraw. On a FAILED paper, everyone refunds.

**Expected end state**
You have seen at least one paper move through OPEN → REVIEWING → FINALIZED, seen the AI verdict panel populate from validator consensus, and (optionally) claimed a payout that appears in your MetaMask balance.

**If something goes wrong**
- MetaMask says "wrong network" → click Connect again, the app calls `wallet_switchEthereumChain`.
- Submit fails with "insufficient funds" → your wallet is empty on studionet. Fund from Studio Accounts panel (see Prerequisites).
- Trigger AI Jury reverts with "not ready to finalize" → paper needs at least one review OR the 24h window must have elapsed.
- Paper shows "not found" after submit → wait 15–30s and refresh; the tx may still be finalizing.

## Expected verification outcome (449 chars / cap 500)
```
After "Trigger AI Jury" on a paper with at least one review, state moves from REVIEWING to FINALIZED and the paper renders an "AI Jury Verdict" panel: ACCEPT or REJECT, three sub-scores (rigor / novelty / reproducibility), and a rationale generated by validator consensus. Each reviewer row shows "Aligned (+5 Rep)" or "Misaligned (-3 Rep)". The finalize tx on explorer-studio.genlayer.com shows GENVM RESULT: SUCCESS and CONSENSUS RESULT: Accepted.
```

## Contract link (primary)
https://explorer-studio.genlayer.com/address/0xCf08ec64514C131bFBEe21A1319C0D58630258D9

- **Address:** `0xCf08ec64514C131bFBEe21A1319C0D58630258D9`
- **Network:** studionet
- **Status:** Preview
- **Role:** `PeerCoinCore` — paper submission, review submission, finalize (nondet consensus), claim, list.
- **Verified via `gen_getContractSchema` 2026-08-25**: schema readable, all methods listed. `get_config()` returns correct constructor args, `next_paper_id: 1`.

**Second contract (ledger):**
https://explorer-studio.genlayer.com/address/0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E
- **Address:** `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`
- **Role:** `ReputationLedger` — persistent reviewer scores (+5 aligned / -3 misaligned), bumped only by `PeerCoinCore`.

## Website
https://peercoin-sooty.vercel.app

## GitHub
https://github.com/phu1271997/PeerCoin

## Community links (optional)
None — leave blank on the form.

---

## PRE-SUBMISSION CHECKLIST

**Truthfulness**
- [ ] B1 cleared: Projects contribution accepted on Portal.
- [ ] B2 cleared: seeded 1 ACCEPT + 1 REJECT paper on live app.
- [ ] Description matches actual app behavior on 2026-08-25 build.
- [ ] Status = Preview (studionet). Not "Live".
- [ ] Tag 1 "Evidence Assessment" → maps to `submit_paper.url` + `submit_review.review_url` + `gl.nondet.web.render` in `finalize()`.
- [ ] Tag 2 "Escrow Claims" → maps to author_stake, reviewer_stake, bounty_pool + `claim()`.

**Deploy state**
- [ ] Latest commit pushed to `main` (last commit `14afe5f`).
- [ ] Vercel prod deployment `peercoin-sooty.vercel.app` returns 200, latest build.
- [ ] `gen_getContractSchema` returns all methods for both contracts.
- [ ] Explorer address page shows tx with GENVM RESULT: SUCCESS (after seeding).

**End-to-end test (in incognito)**
- [ ] Open `peercoin-sooty.vercel.app` in incognito, no wallet.
- [ ] See ≥ 2 seeded papers with visible verdicts on Home.
- [ ] Click into a FINALIZED paper, see AI Jury Verdict panel populated.
- [ ] Leaderboard lists ≥ 2 reviewer addresses with scores.

**Assets & limits**
- [x] Logo `logo-1024.png` — 1024×1024 PNG, 864 KB (< 2 MB cap).
- [x] One-liner: 149 chars (cap 180).
- [x] Description: 992 chars (cap 1000).
- [x] Expected verification outcome: 449 chars (cap 500).
- [x] Website + GitHub both provided.

**Consequences understood**
- Changes requested = one edit round, 14-day deadline.
- Declined = no self-service resubmit.
- One Projects contribution = one Explorer entry.
