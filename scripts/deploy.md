# GenLayer Studionet Deployment Guide for PeerCoin

This guide provides step-by-step instructions for deploying the PeerCoin Intelligent Contracts on GenLayer `studionet`.

## Prerequisites

1. Open [GenLayer Studio](https://studio.genlayer.com/contracts) in your browser.
2. In the **Settings** menu, click **Reset Storage** and perform a hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+F5`).
3. Ensure your MetaMask wallet is connected and switched to **Genlayer Studio Network** (`chainId: 61999`, RPC: `https://studio.genlayer.com/api`).
4. Fund your MetaMask account by transferring GEN tokens from one of the pre-funded accounts in the Studio **Accounts** panel.

---

## Step 1: Deploy `reputation_ledger.py`

1. In GenLayer Studio, create a new contract file named `reputation_ledger.py`.
2. Copy and paste the entire contents of [`contracts/reputation_ledger.py`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/contracts/reputation_ledger.py).
3. Click **Deploy**.
4. In the left panel under Transactions, click the deployment transaction and verify that **`Result: SUCCESS`**.
5. Copy the deployed address; you'll pass it into the core constructor in Step 2 and paste it as `VITE_REPUTATION_ADDRESS` in `frontend/.env`.

---

## Step 2: Deploy `peercoin_core.py`

1. Create a new contract file in Studio named `peercoin_core.py`.
2. Copy and paste the entire contents of [`contracts/peercoin_core.py`](../contracts/peercoin_core.py).
3. Fill in the constructor arguments (**v0.3 adds two new appeal params — the constructor now takes 9 args, not 7**):
   - `reputation_addr`: address of the ReputationLedger deployed in Step 1
   - `author_stake`: `100000000000000000000` (100 GEN in wei)
   - `reviewer_stake`: `20000000000000000000` (20 GEN in wei)
   - `min_reviewers`: `1`
   - `max_reviewers`: `5`
   - `review_window_secs`: `86400` (24 hours)
   - `pass_threshold_avg`: `60`
   - `appeal_stake_multiplier`: `2` (appellant stakes 2× author_stake = 200 GEN)
   - `appeal_window_secs`: `604800` (7 days after finalize)
4. Click **Deploy**.
5. Click the deployment transaction and verify that **`Result: SUCCESS`**.
6. Copy the new core address into `frontend/.env` as `VITE_CONTRACT_ADDRESS`.

---

## Step 3: Link Reputation Ledger to Core Contract

1. In Studio, select the deployed `ReputationLedger` contract interface.
2. Execute the `set_core(core_addr)` method, passing the new PeerCoinCore address.
3. Confirm transaction execution.

---

## Deployed Addresses Summary (Studionet)

**v0.3 (Governance Layer — appeal court + tiered reputation)** — new addresses required.

- `ReputationLedger v0.3`: `0xD8fd9a079aF846466C518459BaAb7E375d998c7e` (deployed 2026-09-08, tx `0x78ea4fdc026c9b41780ec93f3788b865565ae9a5dc12e9803fc8a30c37181da1`)
- `PeerCoinCore v0.3`: `0x451db646730cc3F32291A56ac82d1278A2EB1B0D` (deployed 2026-09-08, tx `0x83cb4c09dab0b7d2cc3e902ac9b06e3c5b176b107ce9291b16bdfbd0142ea313`)
- Linked via `reputation.set_core(core)` tx `0x03a72776a3a8333eb28d186afe68709b92064cd0b6c210dfd6ad0e93a52acd03`

**Previous v0.2.16 deployment (kept for reference — do NOT point the frontend at these; the v0.2 constructor is missing the two appeal params and every appeal call will revert):**

- `ReputationLedger v0.2`: `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`
- `PeerCoinCore v0.2`: `0xCf08ec64514C131bFBEe21A1319C0D58630258D9`
