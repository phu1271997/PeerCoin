# PeerCoin — Scientific Peer Review Economy on GenLayer

> **PeerCoin** is an on-chain scientific peer review marketplace powered by a decentralized GenLayer AI Jury. Authors and reviewers stake tokens to align incentives. An on-chain AI jury evaluates preprints and human reviews in non-deterministic blocks, rewarding aligned reviewers, slashing misaligned reviews, and establishing verifiable scientific reputation.

---

## 1. Problem Statement

Over 70% of scientific papers fail independent replication tests—a systemic issue known as the scientific replication crisis. Traditional peer review is free, anonymous, and slow (taking 2 to 6 months), offering zero financial incentive for rigorous critique and zero accountability when flawed papers pass editorial review. Meanwhile, open preprint servers (such as arXiv and bioRxiv) lack effective gatekeeping, making it difficult for researchers, journalists, and policymakers to discern high-rigor research from unverified claims.

PeerCoin solves this by introducing skin-in-the-game economic incentives to scientific publishing. Authors deposit stake when submitting preprints, while human reviewers stake tokens alongside their evaluations. GenLayer's decentralized AI jury adjudicates preprints directly on-chain, rewarding reviewers who align with the consensus quality evaluation and penalizing low-quality or adversarial reviews.

---

## 2. Why GenLayer is Unique

Traditional EVM smart contracts (written in Solidity) cannot solve this problem because:
1. **No Web Access**: Solidity contracts cannot fetch or render preprint PDFs and web articles directly on-chain (`gl.nondet.web.render`).
2. **No Subjective Reasoning**: Traditional blockchains cannot execute subjective evaluations of research methodology, novelty, or statistical validity (`gl.nondet.exec_prompt`).
3. **Oracle Limitations**: Centralized or off-chain oracle feeds (such as Chainlink) cannot issue subjective quality judgments without introducing central points of failure.

GenLayer's Optimistic Democracy consensus embeds LLM inference directly into validator nodes, enabling on-chain non-deterministic blocks (`gl.vm.run_nondet`) to render web content, evaluate qualitative research claims, and enforce semantic equivalence across validator nodes.

---

## 3. Architecture & Topology

PeerCoin uses a multi-contract architecture to separate core review lifecycle logic from long-term reviewer reputation metrics. **v0.3 (Governance Layer)** adds an Appeal Court on top of the same address:

```
                       ┌────────────────────────────────┐
                       │   PeerCoinCore v0.3            │
Author, Reviewer ─────►│                                │
                       │  Review lifecycle              │
                       │   - submit_paper               │
                       │   - submit_review              │
                       │   - finalize (nondet AI jury)  │
                       │   - claim                      │
                       │                                │
Author (contested) ───►│  Appeal Court (new)            │
                       │   - file_appeal (payable)      │
                       │   - resolve_appeal             │
                       │       (adversarial re-jury,    │
                       │        distinct canary token)  │
                       │   - claim_appeal               │
                       │   - list_appeals / get_appeal  │
                       └──────────┬─────────────────────┘
                                  │ gl.get_contract_at(rep_addr)
                                  ▼
                       ┌────────────────────────────────┐
                       │  ReputationLedger v0.3         │
                       │   - bump(reviewer, +/-)        │
                       │   - score(reviewer)            │
                       │   - tier(reviewer)   (new)     │
                       │   - profile(reviewer) (new)    │
                       │   - batch_profile(csv) (new)   │
                       │   - tier_stats() (new)         │
                       └────────────────────────────────┘
```

- **`PeerCoinCore`** ([`contracts/peercoin_core.py`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/contracts/peercoin_core.py)): Manages paper submissions, reviewer stakes, non-deterministic AI jury adjudication (`gl.vm.run_nondet`), and pull-payment claim distributions.
- **`ReputationLedger`** ([`contracts/reputation_ledger.py`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/contracts/reputation_ledger.py)): Maintains a persistent on-chain score ledger (`TreeMap[str, i256]`) updated by `PeerCoinCore` (+5 points for aligned reviews, -3 points for misaligned reviews).

---

## 4. Step-by-Step Studionet Deployment

1. Open **[GenLayer Studio](https://studio.genlayer.com/contracts)** in your browser.
2. In Settings, select **Reset Storage** and perform a hard refresh (`Cmd+Shift+R`).
3. Connect your MetaMask wallet and switch to **GenLayer Studio Network** (`chainId: 61999` / `0xF1EF`, RPC: `https://studio.genlayer.com/api`).
4. Fund your wallet with GEN from the Studio **Accounts** panel.
5. Deploy `reputation_ledger.py` -> `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`.
6. Deploy `peercoin_core.py` -> `0xCf08ec64514C131bFBEe21A1319C0D58630258D9`.
7. Execute `set_core(peercoin_core_address)` on `ReputationLedger`.

Detailed deployment instructions are available in [`scripts/deploy.md`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/scripts/deploy.md).

---

## 5. Deployed Contract Addresses (Studionet)

**v0.3 — Governance Layer (current, live).** After redeploying with the two new appeal constructor params, fill these rows in and update `frontend/.env`.

| Contract | Version | Network | Address | Explorer Link |
|---|---|---|---|---|
| `PeerCoinCore` | v0.3 | studionet | _(fill in after redeploy)_ | [Explorer](https://explorer-studio.genlayer.com) |
| `ReputationLedger` | v0.3 | studionet | _(fill in after redeploy)_ | [Explorer](https://explorer-studio.genlayer.com) |

**v0.2.16 — pre-appeal deployment (kept for reference, not wired to the current frontend).**

| Contract | Version | Network | Address |
|---|---|---|---|
| `PeerCoinCore` | v0.2.16 | studionet | `0xCf08ec64514C131bFBEe21A1319C0D58630258D9` |
| `ReputationLedger` | v0.2.16 | studionet | `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E` |

---

## 5b. Companion Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) — contract topology, state machine, and non-deterministic consensus flow (with Mermaid diagrams).
- [ECONOMICS.md](ECONOMICS.md) — stake/reward math, worked example, incentive claims.
- [SECURITY.md](SECURITY.md) — threat model, prompt injection defense, hardening notes.
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, PR checklist, contract-change rules.
- [scripts/deploy.md](scripts/deploy.md) — step-by-step Studio deploy.
- [scripts/seed.md](scripts/seed.md) — sample data walkthrough for demos.

---

## 6. Frontend Setup & Local Execution

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Configure environment variables in `.env`:
   ```env
   VITE_CONTRACT_ADDRESS=0xCf08ec64514C131bFBEe21A1319C0D58630258D9
   VITE_REPUTATION_ADDRESS=0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Deploy to Vercel:
   ```bash
   npx vercel --prod
   ```
