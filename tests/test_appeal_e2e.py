"""End-to-end appeal-settlement tests for an ordinary finalized REJECT.

Reviewer ask: an ordinary finalized REJECT must be eligible for its appeal, and
payout obligations must be RESERVED until the appeal window and any appeal are
resolved. These drive the real write path (submit → review → finalize(REJECT)
→ file_appeal → resolve → claim) against the mocked `gl` from conftest, and
assert the money invariants:
  - early claims (inside the appeal window / while appealed) revert,
  - repeated claims revert,
  - total paid out never exceeds the funds actually deposited for THIS paper
    (no double-pay, nothing taken from another entitlement).

Covers REJECT → UPHELD and REJECT → OVERTURNED.
"""
import builtins
import sys

import pytest

GL = builtins.gl  # the mocked genlayer runtime installed by conftest


class _Ident:
    """Identity decorator object. Makes `@gl.public.write`, `@gl.public.view`
    and `@gl.public.write.payable` pass the method through unchanged, so the
    contract's public methods import as real callables instead of the
    MagicMocks conftest would otherwise substitute."""

    def __call__(self, fn):
        return fn

    def __getattr__(self, _name):
        return self


GL.public.write = _Ident()
GL.public.view = _Ident()

# Re-import the contract fresh so the identity decorators take effect.
for _m in list(sys.modules):
    if _m.startswith("contracts."):
        sys.modules.pop(_m, None)

import contracts.peercoin_core as core  # noqa: E402
from contracts.peercoin_core import (  # noqa: E402
    Contract,
    CANARY_TOKEN,
    APPEAL_CANARY_TOKEN,
    STATE_FINALIZED,
    STATE_APPEALED,
)

AUTHOR = "0xauthor"
REV_R = "0xreviewerR"   # votes REJECT  → aligned with the REJECT verdict
REV_A = "0xreviewerA"   # votes ACCEPT  → misaligned with the REJECT verdict
BUYER = "0xoutsider"

AUTHOR_STAKE = 100
REVIEWER_STAKE = 10
APPEAL_MULT = 2
APPEAL_WINDOW = 1000
PASS_THRESH = 60


def _key(a):
    return a.as_hex if hasattr(a, "as_hex") else str(a)


class _Noop:
    def bump(self, *a, **k):
        return None

    def score(self, *a, **k):
        return 0


class _Handle:
    def __init__(self, addr, sink):
        self.addr = addr
        self.sink = sink

    def emit_transfer(self, value=0):
        self.sink.append((_key(self.addr), int(value)))

    def as_interface(self, _iface):
        return _Noop()


@pytest.fixture
def env(monkeypatch):
    """A fresh contract in mock mode, a controllable clock, and a transfer sink."""
    clock = {"t": 1_000_000}
    transfers = []
    GL = builtins.gl

    monkeypatch.setattr(core, "_now_ts", lambda: clock["t"])
    GL.get_contract_at = lambda addr: _Handle(addr, transfers)

    c = object.__new__(Contract)
    c.papers = {}
    c.reviews = {}
    c.appeals = {}
    c.seen_urls = {}
    c.admin = "0xadmin"
    c.reputation = "0xrep"
    c.author_stake_amount = AUTHOR_STAKE
    c.reviewer_stake_amount = REVIEWER_STAKE
    c.min_reviewers = 1
    c.max_reviewers = 5
    c.review_window_secs = 0           # window always open → finalize any time
    c.pass_threshold_avg = PASS_THRESH
    c.appeal_stake_multiplier = APPEAL_MULT
    c.appeal_window_secs = APPEAL_WINDOW
    c.next_paper_id = 0

    def call(method, sender, value, *args):
        GL.message.sender_address = sender
        GL.message.value = value
        return getattr(c, method)(*args)

    return {"c": c, "clock": clock, "transfers": transfers, "call": call}


def _total(transfers):
    return sum(v for _, v in transfers)


def _paid_to(transfers, who):
    return sum(v for a, v in transfers if a == who)


def _reject_ai(r_aligned=True, a_aligned=False):
    return {
        "canary": CANARY_TOKEN,
        "verdict": "REJECT",
        "rigor": 30, "novelty": 30, "reproducibility": 30,
        "reason": "insufficient rigor",
        "reviewer_alignment": {REV_R: r_aligned, REV_A: a_aligned},
    }


def _appeal_ai(overturn):
    if overturn:
        return {
            "canary": APPEAL_CANARY_TOKEN,
            "verdict": "ACCEPT",
            "rigor": 80, "novelty": 80, "reproducibility": 80,
            "reason": "the original REJECT was too harsh",
        }
    return {
        "canary": APPEAL_CANARY_TOKEN,
        "verdict": "REJECT",
        "rigor": 30, "novelty": 30, "reproducibility": 30,
        "reason": "REJECT stands on re-review",
    }


def _bring_to_rejected(env):
    """submit → 2 reviews → finalize into a plain FINALIZED REJECT."""
    c, call = env["c"], env["call"]
    pid = call("submit_paper", AUTHOR, AUTHOR_STAKE, "T", "ml", "https://x.test/p", "abs")
    call("submit_review", REV_R, REVIEWER_STAKE, pid, "REJECT", 90, "https://x.test/rr")
    call("submit_review", REV_A, REVIEWER_STAKE, pid, "ACCEPT", 90, "https://x.test/ra")
    GL.vm.run_nondet = lambda leader, validator: _reject_ai()
    call("finalize", REV_R, 0, pid)
    paper = c.papers[pid]
    assert paper.state == STATE_FINALIZED
    assert paper.ai_verdict == "REJECT"
    return pid


# Funds deposited into a single paper's lifecycle (used as the hard ceiling for
# "nothing may be taken from another entitlement").
DEPOSITS_NO_APPEAL = AUTHOR_STAKE + 2 * REVIEWER_STAKE          # 120
DEPOSITS_WITH_APPEAL = DEPOSITS_NO_APPEAL + AUTHOR_STAKE * APPEAL_MULT  # 320


def test_finalized_reject_is_appealable_and_payouts_reserved(env):
    c, call, clock, transfers = env["c"], env["call"], env["clock"], env["transfers"]
    pid = _bring_to_rejected(env)

    # Early claim INSIDE the appeal window is frozen.
    with pytest.raises(GL.vm.UserError, match="reserved"):
        call("claim", REV_R, 0, pid)
    assert _total(transfers) == 0

    # An ordinary finalized REJECT is eligible for its appeal.
    call("file_appeal", AUTHOR, AUTHOR_STAKE * APPEAL_MULT, pid)
    assert c.papers[pid].state == STATE_APPEALED

    # Still frozen while the appeal is pending.
    with pytest.raises(GL.vm.UserError, match="reserved"):
        call("claim", REV_R, 0, pid)
    assert _total(transfers) == 0


def test_reject_then_overturned_pays_once_and_conserves(env):
    c, call, clock, transfers = env["c"], env["call"], env["clock"], env["transfers"]
    pid = _bring_to_rejected(env)
    call("file_appeal", AUTHOR, AUTHOR_STAKE * APPEAL_MULT, pid)

    GL.vm.run_nondet = lambda leader, validator: _appeal_ai(overturn=True)
    call("resolve_appeal", BUYER, 0, pid)
    assert c.appeals[pid].overturned is True
    assert c.papers[pid].ai_verdict == "ACCEPT"

    # Appellant collects appeal stake + restored author stake (+ capped bonus).
    call("claim_appeal", AUTHOR, 0, pid)
    author_paid = _paid_to(transfers, AUTHOR)
    assert author_paid >= AUTHOR_STAKE + AUTHOR_STAKE * APPEAL_MULT  # >= 300

    # Repeated appeal claim reverts; classic claim reverts (already claimed).
    with pytest.raises(GL.vm.UserError, match="already claimed"):
        call("claim_appeal", AUTHOR, 0, pid)
    with pytest.raises(GL.vm.UserError):
        call("claim", AUTHOR, 0, pid)

    # The reviewer who voted ACCEPT is now the aligned one and may claim.
    call("claim", REV_A, 0, pid)
    # The reviewer who voted REJECT is no longer aligned → cannot claim.
    with pytest.raises(GL.vm.UserError, match="not aligned"):
        call("claim", REV_R, 0, pid)

    # No double-pay and nothing taken from another entitlement.
    assert _total(transfers) <= DEPOSITS_WITH_APPEAL


def test_reject_then_upheld_pays_aligned_reviewer_once_and_conserves(env):
    c, call, clock, transfers = env["c"], env["call"], env["clock"], env["transfers"]
    pid = _bring_to_rejected(env)
    call("file_appeal", AUTHOR, AUTHOR_STAKE * APPEAL_MULT, pid)

    GL.vm.run_nondet = lambda leader, validator: _appeal_ai(overturn=False)
    call("resolve_appeal", BUYER, 0, pid)
    assert c.appeals[pid].overturned is False
    assert c.papers[pid].ai_verdict == "REJECT"

    # Appellant gets nothing back on an upheld REJECT.
    with pytest.raises(GL.vm.UserError):
        call("claim_appeal", AUTHOR, 0, pid)
    with pytest.raises(GL.vm.UserError):
        call("claim", AUTHOR, 0, pid)

    # The aligned (REJECT) reviewer collects stake + pool reward exactly once.
    call("claim", REV_R, 0, pid)
    r_paid = _paid_to(transfers, REV_R)
    assert r_paid > REVIEWER_STAKE
    with pytest.raises(GL.vm.UserError, match="already claimed"):
        call("claim", REV_R, 0, pid)

    # Misaligned reviewer cannot claim.
    with pytest.raises(GL.vm.UserError, match="not aligned"):
        call("claim", REV_A, 0, pid)

    # Conservation: everything paid came from this paper's own deposits.
    assert _total(transfers) <= DEPOSITS_WITH_APPEAL


def test_reject_no_appeal_unfreezes_after_window(env):
    c, call, clock, transfers = env["c"], env["call"], env["clock"], env["transfers"]
    pid = _bring_to_rejected(env)

    # Frozen during the window.
    with pytest.raises(GL.vm.UserError, match="reserved"):
        call("claim", REV_R, 0, pid)

    # After the appeal window elapses with no appeal, claims unfreeze.
    clock["t"] += APPEAL_WINDOW + 1
    call("claim", REV_R, 0, pid)
    assert _paid_to(transfers, REV_R) > REVIEWER_STAKE
    with pytest.raises(GL.vm.UserError, match="already claimed"):
        call("claim", REV_R, 0, pid)

    # Misaligned reviewer + failed author get nothing.
    with pytest.raises(GL.vm.UserError, match="not aligned"):
        call("claim", REV_A, 0, pid)
    with pytest.raises(GL.vm.UserError):
        call("claim", AUTHOR, 0, pid)

    assert _total(transfers) <= DEPOSITS_NO_APPEAL
