# Sample Data Seed Guide — PeerCoin on studionet

Seed the contract with one demo preprint and two demo reviews so a first-time viewer sees a populated app instead of an empty state. Time: ~10 minutes. Cost: 100 + 20 + 20 = **140 GEN** on studionet (all recoverable via `claim` after `finalize`).

## Pre-flight

1. Confirm the deployed core address matches [.env.example](../.env.example) (`0x0db9824dE6E9fAcfCe13701123b9e3c95C4AD38E` at time of writing). If not, update `.env` and redeploy the frontend.
2. Fund **three** studionet accounts (author + 2 reviewers) from the GenLayer Studio Accounts panel. Each needs at least 25 GEN; the author needs at least 105 GEN (100 stake + 5 buffer).
3. Import all three private keys into MetaMask (or use three browser profiles).

## Step 1 — Submit demo preprint (Author wallet)

Connect to `https://<your-vercel-url>` with the **Author** wallet, click **Submit Preprint**, and paste:

| Field | Value |
|---|---|
| Title | `Transformer-based Zero-Knowledge Proofs for Autonomous Agent Consensus` |
| Field | `cs` |
| URL | `https://arxiv.org/abs/2401.00001` (or any real arXiv paper you want the AI jury to actually read) |
| Abstract | *(paste 3-4 real sentences — this is what the jury sees on first pass)* |
| Bounty Topup | `10` |

Total deposit: **110 GEN**. Submit. Wait for MetaMask, then wait for the "Preprint #N Published on GenLayer Studionet!" confirmation. Note the paper id.

## Step 2 — Submit review #1 (Reviewer A — aligned with paper)

Switch MetaMask to **Reviewer A**. Open the paper detail page for the id from step 1. Click **Submit Human Review**.

| Field | Value |
|---|---|
| Verdict | `ACCEPT` |
| Confidence | `85` |
| Review URL | `https://gist.github.com/<your-account>/<review-a-gist-id>` — the gist should be a real page the LLM can render |

Stake: **20 GEN**. Submit. Wait for confirmation.

**Gist content template** — paste this into a public gist first:

```
Review of Paper #<id>

STRENGTHS
- Clear methodology section
- Novel application of transformer architecture
- Reproducible: code released on GitHub

WEAKNESSES
- Small sample size (n=42)
- Limited baseline comparison

VERDICT: ACCEPT with minor revisions
```

## Step 3 — Submit review #2 (Reviewer B — mild dissent)

Switch to **Reviewer B**. Same paper, click **Submit Human Review**.

| Field | Value |
|---|---|
| Verdict | `WEAK_REJECT` |
| Confidence | `60` |
| Review URL | `https://gist.github.com/<your-account>/<review-b-gist-id>` |

Stake: **20 GEN**. Submit.

**Gist B template**:

```
Review of Paper #<id>

CONCERNS
- Baseline is not competitive (comparing to a 2019 model)
- Statistical significance not properly reported (no confidence intervals)
- Threats to validity dismissed in one sentence

RECOMMENDATION: WEAK_REJECT until baseline is updated and CI reported
```

## Step 4 — Trigger the AI jury

Any wallet can trigger `finalize`. Use the author or a fresh wallet. Open the paper detail page, click **Trigger AI Jury**, sign the tx, wait for `LoadingConsensus` to complete.

The paper card should now show `AI: ACCEPT` or `AI: REJECT`, the `VerdictCard` should render `rigor / novelty / reproducibility` scores, and the reviewer list should show one Aligned and one Misaligned badge.

## Step 5 — Claim payouts

Switch to whichever wallet was aligned. Click **Claim Stake + Bounty** on the paper detail page. That wallet gets `20 stake + bounty_pool / 1` GEN back (single aligned reviewer takes the whole pool).

The misaligned reviewer will see `UserError: reviewer was not aligned with AI jury` on claim — that's the design.

Author claims separately if the paper passed (avg ≥ 60).

## Verification

- Open the [studionet Explorer](https://explorer-studio.genlayer.com), search for the finalize tx hash, confirm `Result: SUCCESS`.
- On the Leaderboard page, the aligned reviewer's address should show `+5 pts`, the misaligned should show `-3 pts`.

## Cleanup / repeat

Re-seed by submitting a fresh preprint with a **different URL** (the `seen_urls` guard blocks duplicates). Reviews / reputation from the old paper stay on-chain.

## Why do this at all

- The empty state on Home says "No preprints published yet." That is the worst possible first impression. One seeded paper turns the app into something a Portal reviewer can actually click through.
- Every step here is a real on-chain tx. If the demo path works, the app works — no room for "it looked right in the mock."
- Screenshots of the fully populated Home + PaperDetail + VerdictCard + Leaderboard are exactly the evidence a Real Traction / UX Overhaul milestone needs.
