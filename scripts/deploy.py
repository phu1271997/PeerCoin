"""Automated studionet deploy for PeerCoin v0.3.

Usage:
    source ~/.genlayer/env.sh
    python3 scripts/deploy.py

Environment:
    GENLAYER_PRIVATE_KEY — required, deployer key (must have GEN balance)
    REPUTATION_ADDR      — optional, skip reputation deploy and use this addr
    CORE_ARGS            — optional JSON override of core constructor args

Deploys the two contracts in order, calls set_core to link them, prints the
final addresses to stdout, and writes them to submission/deployed_addresses_v3.txt.
"""
import json
import os
import sys
from pathlib import Path

from genlayer_py import create_client, create_account, studionet
from genlayer_py.types import TransactionStatus
from genlayer_py.types.calldata import CalldataAddress

ROOT = Path(__file__).resolve().parent.parent
CORE_SRC = ROOT / "contracts" / "peercoin_core.py"
REP_SRC = ROOT / "contracts" / "reputation_ledger.py"
OUT_FILE = ROOT / "submission" / "deployed_addresses_v3.txt"

DEFAULT_CORE_ARGS = {
    "author_stake": 100 * 10**18,          # 100 GEN
    "reviewer_stake": 20 * 10**18,         # 20 GEN
    "min_reviewers": 1,
    "max_reviewers": 5,
    "review_window_secs": 86400,           # 24h
    "pass_threshold_avg": 60,
    "appeal_stake_multiplier": 2,          # 2x author stake
    "appeal_window_secs": 7 * 86400,       # 7 days
}


def _deployed_address(receipt: dict) -> str:
    """Pull the deployed contract address out of a genlayer_py receipt dict.
    deploy_contract puts it at receipt.data.contract_address; fall back to
    receipt.to_address / receipt.recipient which the studionet sim also fills."""
    data = receipt.get("data") or {}
    addr = data.get("contract_address")
    if addr:
        return addr
    return receipt.get("to_address") or receipt.get("recipient")


def _require_accepted(receipt: dict, label: str) -> None:
    status = receipt.get("status_name") or receipt.get("status")
    if status not in ("ACCEPTED", "FINALIZED"):
        raise RuntimeError(f"{label} failed: status={status}\n{json.dumps(receipt, default=str)[:1000]}")


def main() -> int:
    key = os.environ.get("GENLAYER_PRIVATE_KEY")
    if not key:
        print("ERROR: source ~/.genlayer/env.sh first", file=sys.stderr)
        return 2

    account = create_account(account_private_key=key)
    client = create_client(chain=studionet, account=account)
    balance = client.get_balance(account.address)
    print(f"Deployer: {account.address}")
    print(f"Balance : {balance / 10**18:.4f} GEN")
    if balance < 5 * 10**18:
        print("ERROR: balance < 5 GEN; top up from Studio Accounts panel", file=sys.stderr)
        return 3

    # -------- Step 1: reputation ledger --------
    rep_addr = os.environ.get("REPUTATION_ADDR")
    if rep_addr:
        print(f"[skip] reputation already at {rep_addr}")
    else:
        print("[1/3] Deploying reputation_ledger.py …")
        code = REP_SRC.read_bytes()
        tx = client.deploy_contract(code=code)
        print(f"      tx: {tx}")
        rcpt = client.wait_for_transaction_receipt(
            transaction_hash=tx,
            status=TransactionStatus.ACCEPTED,
            interval=3000,
            retries=60,
        )
        _require_accepted(rcpt, "reputation deploy")
        rep_addr = _deployed_address(rcpt)
        print(f"      address: {rep_addr}")

    # -------- Step 2: peercoin core --------
    args_override_raw = os.environ.get("CORE_ARGS")
    core_cfg = dict(DEFAULT_CORE_ARGS)
    if args_override_raw:
        core_cfg.update(json.loads(args_override_raw))

    core_args = [
        CalldataAddress(rep_addr),
        core_cfg["author_stake"],
        core_cfg["reviewer_stake"],
        core_cfg["min_reviewers"],
        core_cfg["max_reviewers"],
        core_cfg["review_window_secs"],
        core_cfg["pass_threshold_avg"],
        core_cfg["appeal_stake_multiplier"],
        core_cfg["appeal_window_secs"],
    ]
    print("[2/3] Deploying peercoin_core.py …")
    print(f"      constructor args: {core_args}")
    code = CORE_SRC.read_bytes()
    tx = client.deploy_contract(code=code, args=core_args)
    print(f"      tx: {tx}")
    rcpt = client.wait_for_transaction_receipt(
        transaction_hash=tx,
        status=TransactionStatus.ACCEPTED,
        interval=3000,
        retries=80,
    )
    _require_accepted(rcpt, "core deploy")
    core_addr = _deployed_address(rcpt)
    print(f"      address: {core_addr}")

    # -------- Step 3: set_core on reputation --------
    print(f"[3/3] Calling reputation.set_core({core_addr}) …")
    tx = client.write_contract(
        address=rep_addr,
        function_name="set_core",
        args=[CalldataAddress(core_addr)],
        value=0,
    )
    print(f"      tx: {tx}")
    rcpt = client.wait_for_transaction_receipt(
        transaction_hash=tx,
        status=TransactionStatus.ACCEPTED,
        interval=3000,
        retries=60,
    )
    _require_accepted(rcpt, "set_core")

    # -------- Write result --------
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        f"REPUTATION_v3={rep_addr}\n"
        f"CORE_v3={core_addr}\n"
        f"DEPLOYER={account.address}\n"
    )
    print(f"\n✓ Wrote {OUT_FILE}")
    print("\nFrontend env vars:")
    print(f"  VITE_CONTRACT_ADDRESS={core_addr}")
    print(f"  VITE_REPUTATION_ADDRESS={rep_addr}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
