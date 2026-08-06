# Contributing to PeerCoin

Thanks for reading this. PeerCoin is a GenLayer testnet Builder submission; the codebase is small and welcomes upgrades that make it more useful, more secure, or more legible.

## Getting set up

```bash
git clone <your-fork>
cd 6-PeerCoin
# frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
# tests
cd ..
python -m venv .venv && source .venv/bin/activate
pip install pytest
pytest tests/
```

You need MetaMask with the **GenLayer Studio Network** added and funded to try the live app. The frontend does the network add for you the first time you click Connect.

## Where things live

Read [ARCHITECTURE.md](ARCHITECTURE.md) first. It has diagrams for the contract topology, the paper state machine, and the non-deterministic consensus flow.

## Making a change

1. **Open an issue first** if the change touches contract math, deploy addresses, or the AI jury prompt. Silent changes to any of those either need a redeploy or affect verdict reproducibility.
2. **One concern per PR.** Documentation, UX polish, and contract math are three different review checklists.
3. **Commit style** — imperative, prefix with the scope:
   - `feat(contract): …` — new public method, new state
   - `fix(contract): …` — bug in existing logic
   - `feat(frontend): …`
   - `docs: …`
   - `test: …`
   - `chore: …`
4. **Update the CHANGELOG.** Each PR that ships user-visible or contract-behavior changes gets one entry under `[Unreleased]`.

## Contract changes (extra care)

Every contract edit needs to answer:

- Does it change the GenVM storage layout? (New/renamed fields → yes → redeploy is mandatory, old state does not migrate.)
- Does it change the nondet prompt or `validator_fn` logic? (Yes → old finalized papers stay valid, but re-running `finalize` on an in-flight paper may give different answers. Note this in the PR body.)
- Does it change the public method signature? (Yes → frontend needs updating in the same PR.)
- Does it introduce a bare `int` field, a `dict`/`list` in storage, an `import genlayer`, or a `TreeMap[Address, …]` on a public boundary? (Any one → deploy will fail at schema-load time. See [SECURITY.md](SECURITY.md) and the GenLayer common-errors reference before writing.)

Test the change in the [GenLayer Studio](https://studio.genlayer.com/contracts) first — deploy, run one tx, check `Result: SUCCESS` (not just `Status: FINALIZED`) before touching the live app.

## Frontend changes

- Never place a private key in a `VITE_` env var. Everything user-signed goes through MetaMask.
- Never remove the `wallet_switchEthereumChain` call on connect. Users who arrive on a different network will silently produce failing txs otherwise (see R23).
- Read `chainId` from `studionet.id`, not a literal — if GenLayer bumps the id we follow automatically.

## Running the tests

```bash
pytest tests/           # pure-Python unit tests with a mocked `genlayer` module
```

The mocked genlayer module is defined in `tests/conftest.py` so tests run without a Studio connection. For the real thing:

```bash
gltest --network studionet     # requires genlayer-test installed and Studio online
```

Nondet tests need `sim_installMocks` (bare dict, not wrapped in a list — R17). See any existing test in `tests/` for the pattern.

## Deploying (only maintainers)

The contract addresses live in `.env.example`, `frontend/.env`, `frontend/src/lib/client.ts`, [scripts/deploy.md](scripts/deploy.md), and [README.md](README.md). If you deploy, update **all five** in one commit. Grep for the old address to be sure:

```bash
grep -rn "0x<OLD_ADDRESS>" . --exclude-dir=node_modules --exclude-dir=.git
```

## Code review checklist for reviewers

- [ ] CHANGELOG entry added and readable to a non-author
- [ ] Contract change → PR body notes redeploy requirement
- [ ] Frontend change → tested in browser on studionet, screenshot in PR
- [ ] No new `Address` key in a `TreeMap` on a public boundary
- [ ] No new bare `int` field in storage
- [ ] Every new `gl.nondet.*` call lives inside `gl.vm.run_nondet` or `gl.eq_principle.*`

## Code of conduct

Be constructive, credit prior work, don't ship code that can't be run by someone new checking out `main`.
