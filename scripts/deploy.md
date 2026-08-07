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
5. Deployed Address: `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`.

---

## Step 2: Deploy `peercoin_core.py`

1. Create a new contract file in Studio named `peercoin_core.py`.
2. Copy and paste the entire contents of [`contracts/peercoin_core.py`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/contracts/peercoin_core.py).
3. Fill in the constructor arguments:
   - `reputation_addr`: `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`
   - `author_stake`: `100000000000000000000` (100 GEN in wei)
   - `reviewer_stake`: `20000000000000000000` (20 GEN in wei)
   - `min_reviewers`: `1`
   - `max_reviewers`: `5`
   - `review_window_secs`: `86400` (24 hours)
   - `pass_threshold_avg`: `60`
4. Click **Deploy**.
5. Click the deployment transaction and verify that **`Result: SUCCESS`**.
6. Deployed Address: `0x8Ffd4Abda597A1A90cB0564aB121E0cb66AE9f0E`.

---

## Step 3: Link Reputation Ledger to Core Contract

1. In Studio, select the deployed `ReputationLedger` contract interface.
2. Execute the `set_core(core_addr)` method, passing `0x8Ffd4Abda597A1A90cB0564aB121E0cb66AE9f0E`.
3. Confirm transaction execution.

---

## Deployed Addresses Summary (Studionet)

- `ReputationLedger`: `0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E`
- `PeerCoinCore`: `0x8Ffd4Abda597A1A90cB0564aB121E0cb66AE9f0E`
