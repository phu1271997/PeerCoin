# Changelog

All notable changes to the PeerCoin project will be documented in this file.

## [v0.1.0] - 2026-08-05

### Added
- **Intelligent Contracts**:
  - `contracts/reputation_ledger.py`: Multi-contract reputation tracking ledger for peer reviewers.
  - `contracts/peercoin_core.py`: Peer review marketplace with author staking, reviewer staking, bounty pools, and on-chain AI jury non-deterministic consensus via `gl.vm.run_nondet`.
- **Test Suite**:
  - `tests/conftest.py`: Test environment setup and registry reset fixtures.
  - `tests/test_submit_and_review.py`: Unit tests for paper submission, stake rules, and review constraints.
  - `tests/test_ai_jury.py`: Mock AI jury installer tests using `sim_installMocks`.
  - `tests/test_edge_cases.py`: LLM JSON response extraction and prompt formatting unit tests.
- **Frontend App**:
  - React 18, Vite, TypeScript, TailwindCSS frontend connecting via `genlayer-js` and MetaMask to GenLayer `studionet`.
  - Pages for preprint browsing, author paper submission, peer review submission, consensus execution, and reviewer reputation leaderboards.
- **Deployment & Documentation**:
  - Detailed `README.md` covering replication crisis problem statement, GenLayer USP, step-by-step deployment on `studionet`, and video walkthrough outline.
  - `scripts/deploy.md` deployment guide for GenLayer Studio.
