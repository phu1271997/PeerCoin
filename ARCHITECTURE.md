# PeerCoin — Architecture

## System Overview

PeerCoin runs entirely on GenLayer **studionet** (`chainId 61999`). Two Intelligent Contracts hold all state, and a Vite/React frontend calls them through `genlayer-js` with MetaMask signing. Nothing off-chain — the AI jury runs inside the consensus block via `gl.vm.run_nondet`.

## Contract Topology

```mermaid
flowchart LR
    Author[Author wallet] -->|submit_paper<br/>stake 100 GEN| Core
    Reviewer[Reviewer wallet] -->|submit_review<br/>stake 20 GEN| Core
    Anyone[Anyone] -->|finalize| Core
    Anyone -->|claim| Core

    subgraph Studionet ["GenLayer studionet — chainId 61999"]
        Core[PeerCoinCore<br/>0xad49...5732]
        Rep[ReputationLedger<br/>0x0AEe...291E]
    end

    Core -->|bump reviewer, +5 / -3| Rep
    Core -->|emit_transfer payout| Author
    Core -->|emit_transfer payout| Reviewer

    Core -.->|gl.nondet.web.render| Preprint[(Preprint PDF /<br/>arXiv abstract)]
    Core -.->|gl.nondet.web.render| ReviewDoc[(Review gist / doc)]
    Core -.->|gl.nondet.exec_prompt<br/>3 lenses + canary| LLM[Validator LLMs]

    Frontend[Vite / React frontend<br/>Vercel] -->|readContract / writeContract| Core
    Frontend -->|readContract score| Rep
```

## Lifecycle — Paper State Machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: submit_paper
    OPEN --> REVIEWING: first submit_review
    REVIEWING --> REVIEWING: submit_review (up to max_reviewers)
    REVIEWING --> FINALIZED: finalize<br/>(consensus reached)
    OPEN --> FINALIZED: finalize<br/>(window expired)
    REVIEWING --> FAILED: finalize<br/>(LLM JSON unparseable)
    OPEN --> FAILED: finalize<br/>(LLM JSON unparseable)
    FINALIZED --> [*]: claim (per reviewer / author)
    FAILED --> [*]: claim (stake refund)
```

## Non-deterministic Consensus Block — `finalize`

```mermaid
sequenceDiagram
    participant U as User (wallet)
    participant C as PeerCoinCore
    participant L as Leader validator
    participant V as Validator N
    participant R as ReputationLedger

    U->>C: finalize(paper_id)
    C->>C: read paper + reviews from storage<br/>(BEFORE nondet block)
    C->>L: gl.vm.run_nondet(leader_fn, validator_fn)
    L->>L: gl.nondet.web.render(paper_url)
    L->>L: gl.nondet.web.render(each review_url)
    L->>L: gl.nondet.exec_prompt(3-lens jury prompt<br/>with injection canary)
    L-->>C: JSON verdict (leader)
    V->>V: same rendering + prompt
    V->>V: compare leader verdict vs own<br/>(verdict match + avg tolerance ±15)
    V-->>C: Agree / Disagree
    C->>C: settle stakes, mark aligned reviewers
    loop for each reviewer
        C->>R: bump(reviewer, +5 aligned / -3 misaligned)
    end
    C-->>U: FINALIZED (state written on-chain)
```

## Why the Leader/Validator split matters

- **Leader** runs the prompt once. The JSON it returns becomes the on-chain verdict if consensus is reached.
- **Validators** each rerun the same prompt independently and vote using `validator_fn`. The function compares **verdict** (`ACCEPT` vs `REJECT`) and the **average of `rigor/novelty/reproducibility`** with a `±15` tolerance. Free-text `reason` deliberately does **not** need to match — that is the difference between Trục 2 score 1 (schema match) and 4+ (semantic match).
- If validators disagree, `gl.vm.run_nondet` raises and the transaction reverts. There is no "leader wins by default" — an adversarial leader gets caught.

## Frontend ↔ Contract Interaction

```mermaid
flowchart TB
    subgraph Browser
        UI[React pages<br/>Home / Submit /<br/>PaperDetail / Review /<br/>Finalize / Leaderboard]
        Wallet[wallet.ts<br/>ensureStudionet]
        Client[client.ts<br/>createClient chain: studionet]
    end

    subgraph MetaMask
        MM[MetaMask signer]
    end

    UI --> Wallet
    UI --> Client
    Wallet -->|wallet_switchEthereumChain<br/>chainId 0xF1EF| MM
    Client -->|writeContract / readContract| RPC[https://studio.genlayer.com/api]
    MM -->|sign txs| RPC
    RPC --> Contracts[Deployed contracts<br/>on studionet]
```

## Directory Layout

```
6-PeerCoin/
├── contracts/
│   ├── peercoin_core.py          # main marketplace + AI jury (non-det)
│   └── reputation_ledger.py      # score bump / read (deterministic)
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── client.ts         # genlayer-js client, contract addresses
│   │   │   └── wallet.ts         # MetaMask + wallet_switchEthereumChain
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── .env                      # VITE_CONTRACT_ADDRESS, VITE_REPUTATION_ADDRESS
├── tests/                        # pytest + mocked genlayer module
├── scripts/
│   ├── deploy.md                 # step-by-step Studio deploy
│   └── seed.md                   # sample data walkthrough for demo
├── ARCHITECTURE.md               # this file
├── ECONOMICS.md                  # stake / reward math
├── SECURITY.md                   # threat model + hardening notes
├── CONTRIBUTING.md
├── CHANGELOG.md
└── README.md
```

## Storage schema — one place to reference

| Field | Type | Where | Note |
|---|---|---|---|
| `papers` | `TreeMap[str, Paper]` | Core | key = `str(paper_id)` (R19) |
| `reviews` | `TreeMap[str, TreeMap[str, Review]]` | Core | inner allocated via `gl.storage.inmem_allocate` (R18) |
| `seen_urls` | `TreeMap[str, bool]` | Core | dedup preprint URLs |
| `reputation` | `Address` | Core | ReputationLedger address |
| `admin` | `Address` | Core | deployer |
| `next_paper_id` | `bigint` | Core | monotonic id |
| `scores` | `TreeMap[str, i256]` | Rep | key = `str(addr)` |
| `core` | `Address` | Rep | authorized caller (set via `set_core`) |
| `admin` | `Address` | Rep | deployer |

All numeric persistence uses `bigint`, `u8`, or `i256`. No bare `int`, no `list`, no `dict` — see [SECURITY.md](SECURITY.md) and [`02-common-errors.md`](../gen-rules/02-common-errors.md) R14 / R18 / R19.

## Non-determinism boundaries

- Storage reads and address conversions happen **before** entering the nondet closure — closures capture Python values, not GenVM storage handles.
- `gl.nondet.web.render` and `gl.nondet.exec_prompt` are **only** called inside `leader_fn` / `validator_fn` passed to `gl.vm.run_nondet` (Rule #7).
- `validator_fn` returns `bool`. Any exception inside it is sandboxed by `run_nondet` — but we still return `False` explicitly for the `not isinstance(leader_res, gl.vm.Return)` branch so a leader error becomes a clean Disagree.

## Failure modes and recovery

| Failure | Effect | Recovery |
|---|---|---|
| LLM returns unparseable JSON on leader | Paper → `FAILED` | Author + all reviewers call `claim` to withdraw stakes |
| Validators disagree with leader | `finalize` tx reverts | Anyone can retry `finalize` — new leader/validators |
| Review window not expired + not enough reviewers | `_require` raises `UserError` | Wait for more reviewers or window expiry |
| Reviewer submits duplicate | `_require` raises | Reviewer picks a different paper |
| Duplicate preprint URL | `_require` raises on `submit_paper` | Author changes URL |

## Deploy addresses (studionet)

Source of truth: [.env.example](.env.example) and [frontend/src/lib/client.ts](frontend/src/lib/client.ts). Update both when redeploying.
