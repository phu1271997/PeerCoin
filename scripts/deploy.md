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
5. Copy the deployed contract address (e.g., `0xReputationAddress...`).

---

## Step 2: Deploy `peercoin_core.py`

1. Create a new contract file in Studio named `peercoin_core.py`.
2. Copy and paste the entire contents of [`contracts/peercoin_core.py`](file:///Users/peter/Downloads/AI/Genlayer/6-PeerCoin/contracts/peercoin_core.py).
3. Fill in the constructor arguments:
   - `reputation_addr`: Address of `ReputationLedger` (from Step 1)
   - `author_stake`: `100000000000000000000` (100 GEN in wei)
   - `reviewer_stake`: `2000000000000000000` (20 GEN in wei)
   - `min_reviewers`: `1` (or `3` for production)
   - `max_reviewers`: `5`
   - `review_window_secs`: `86400` (24 hours)
   - `pass_threshold_avg`: `60`
4. Click **Deploy**.
5. Click the deployment transaction and verify that **`Result: SUCCESS`**.
6. Copy the deployed contract address (e.g., `0xCoreAddress...`).

---

## Step 3: Link Reputation Ledger to Core Contract

1. In Studio, select the deployed `ReputationLedger` contract interface.
2. Execute the `set_core(core_addr)` method, passing the address of `PeerCoinCore` from Step 2.
3. Confirm transaction execution.

---

## Deployed Addresses Summary

- `ReputationLedger`: `0x0000000000000000000000000000000000000000`
- `PeerCoinCore`: `0x0000000000000000000000000000000000000000`
