# PeerCoin — Economics

The design goal: **make careful review strictly more profitable than lazy or adversarial review**, and make submitting weak preprints strictly more costly than not submitting.

All numbers below are on-chain constants set at deploy time in `peercoin_core.py`'s constructor. Change them by redeploying with new args (see [scripts/deploy.md](scripts/deploy.md)).

## Parameters (current deployment)

| Parameter | Value | Meaning |
|---|---|---|
| `author_stake` | `100 GEN` | Deposit required to submit a preprint |
| `reviewer_stake` | `20 GEN` | Deposit required to submit one review |
| `min_reviewers` | `1` | `finalize` allowed once N reviews are in |
| `max_reviewers` | `5` | Cap per paper (avoids infinite gas) |
| `review_window_secs` | `86400` (24h) | After this, `finalize` allowed even without min reviewers |
| `pass_threshold_avg` | `60` | AI jury's `(rigor + novelty + reproduc) / 3` must clear this for author to pass |

## Flow of funds — happy path (paper passes)

```
Author deposits 100 GEN (+ optional bounty topup)
    │
    ▼
  bounty_pool = topup
  author_stake = 100 GEN (locked)

Reviewer i deposits 20 GEN
    │
    ▼
  reviews[paper_id][reviewer_i].stake = 20 GEN (locked)

finalize()
    │
    ▼
  AI jury verdict: ACCEPT, avg >= 60
    ├─ author passes → author_stake stays claimable by author
    ├─ misaligned reviewer stakes → added to bounty_pool
    └─ reputation.bump(+5 aligned / -3 misaligned)

claim()
    ├─ author       →  100 GEN back
    ├─ aligned rev  →  20 GEN back + (bounty_pool / aligned_count)
    └─ misaligned   →  nothing (stake forfeited to pool)
```

## Flow of funds — author fails

```
finalize() → AI verdict: REJECT OR avg < 60
    ├─ author_stake → added to bounty_pool (forfeited)
    ├─ misaligned reviewer stakes → added to bounty_pool
    └─ aligned reviewers still get their stake + bounty share

claim()
    ├─ author       →  UserError "author failed review threshold"
    ├─ aligned rev  →  20 GEN back + (bigger bounty_pool / aligned_count)
    └─ misaligned   →  nothing
```

## Flow of funds — LLM verdict unparseable (`FAILED`)

Different branch entirely — nobody is "right" or "wrong" so all stakes refund:

```
finalize() → JSON parse error on leader result
    ├─ paper.state = FAILED
    └─ no reputation bumps

claim()
    ├─ author      →  100 GEN back
    └─ every rev   →  20 GEN back
```

Bounty topup stays in the contract (the sponsor accepted the risk when funding).

## Worked example — 1 paper, 4 reviewers

- Author submits with 10 GEN bounty topup → **110 GEN** locked.
- 4 reviewers each stake 20 GEN → **+80 GEN** locked. Contract balance = 190 GEN.
- AI jury says `ACCEPT`, avg = 72.
- 3 reviewers were aligned, 1 misaligned.
- Misaligned stake (20 GEN) → bounty pool.
- Bounty pool = 10 topup + 20 forfeit = **30 GEN**.
- Author claims → 100 GEN back.
- Each aligned reviewer claims → 20 stake + (30 / 3) = **30 GEN each**.
- Misaligned reviewer claims → `UserError`, 0 GEN.
- Contract balance after all claims = 0. ✓

## Reputation math

`ReputationLedger.scores` maps `str(addr) → i256`. Ledger is monotonic across every paper the reviewer ever touches. `PeerCoinCore` is the sole authorized bumper (`set_core` guard on ledger).

| Event | Delta |
|---|---|
| Reviewer aligned with AI jury verdict on a finalized paper | `+5` |
| Reviewer misaligned | `-3` |

Scores are pure signal — no economic effect today. Roadmap: reputation gating (top-decile reviewers unlock lower stake or higher bounty share), stake multipliers, reviewer waitlists per field.

## Incentive claims

1. **Rational reviewer stake-return**: expected value of an honest, careful review is strictly positive as long as the reviewer's alignment probability > `stake / (stake + expected_bounty_share)`. At current 20 GEN stake and typical single-misaligned-reviewer bounty, this breakeven is ~70% alignment — well below what a competent human reviewer achieves.
2. **Weak-paper deterrent**: an author who submits a paper they know is weak loses 100 GEN with high probability. This is 5× the reviewer stake and 100× a coffee — meaningful friction for spam, negligible for a real researcher submitting a real paper.
3. **Cost of adversarial LLM validators**: even if a leader tries to inject a fake verdict, validators re-run the prompt independently and vote via `validator_fn` — verdict mismatch or avg drift > 15 rejects the tx. An adversarial leader forfeits no stake but wastes gas and gets no verdict written. Multi-round appeal (planned) will slash validator stake in future testnets.

## When to redeploy vs adjust off-chain

- **Parameter tuning** (stake amounts, thresholds): redeploy `PeerCoinCore` with new constructor args, update `.env`, call `set_core` on the same ledger to point it at the new core. Old papers stay on the old contract.
- **Bug fixes to state math**: redeploy both contracts, migrate off-chain if needed.
- **Bounty top-up for a specific paper**: no redeploy — call `sponsor_bounty(paper_id)` with any GEN attached.

## Open economic questions

- Optimal `pass_threshold_avg` — 60 is a starting point copied from typical journal accept thresholds. Real data on studionet will inform tuning.
- Whether misaligned stakes should redistribute pro-rata by `confidence` (currently equal-weighted). More confident + wrong = more punished?
- Field-specific stake amounts — a biology preprint takes more work to review than a math preprint, arguably stakes should differ.
