"""Lifecycle + settlement + refund tests.

Tests the pure logic that governs slashing, rewards, reputation, and refunds
BEFORE any funds move. Covers the review feedback items:
 - verdict-to-threshold consistency
 - validator agreement on every field that controls settlement
 - lifecycle: pass / fail / FAILED / borderline / double-claim guards
"""
import json
import pytest

from contracts.peercoin_core import (
    _derive_verdict,
    _validate_llm_output,
    _settle_reviewers,
    _extract_json,
    _validate_url,
    CANARY_TOKEN,
    BORDERLINE_MARGIN,
    MAX_URL_LEN,
    VERDICT_ACCEPT,
    VERDICT_REJECT,
    VERDICT_WEAK_ACCEPT,
    VERDICT_WEAK_REJECT,
    STATE_OPEN,
    STATE_REVIEWING,
    STATE_FINALIZED,
    STATE_FAILED,
)


# ---------------------------------------------------------------------------
# Verdict-to-threshold consistency (reviewer feedback item 3)
# ---------------------------------------------------------------------------

def test_derive_verdict_accept_above_threshold():
    verdict, avg, borderline = _derive_verdict(80, 75, 70, pass_thresh=60)
    assert verdict == "ACCEPT"
    assert avg == 75
    assert borderline is False


def test_derive_verdict_reject_below_threshold():
    verdict, avg, borderline = _derive_verdict(30, 40, 20, pass_thresh=60)
    assert verdict == "REJECT"
    assert avg == 30
    assert borderline is False


def test_derive_verdict_borderline_exactly_at_threshold():
    verdict, avg, borderline = _derive_verdict(60, 60, 60, pass_thresh=60)
    assert avg == 60
    assert borderline is True   # exact match falls within BORDERLINE_MARGIN


def test_derive_verdict_borderline_just_above():
    verdict, avg, borderline = _derive_verdict(64, 64, 64, pass_thresh=60)
    assert avg == 64
    assert borderline is True   # 60+BORDERLINE_MARGIN=65 → within range


def test_derive_verdict_not_borderline_above_margin():
    verdict, avg, borderline = _derive_verdict(70, 70, 70, pass_thresh=60)
    assert avg == 70
    assert borderline is False


# ---------------------------------------------------------------------------
# LLM output validation — the checks that guard slashing / rewards / rep
# (reviewer feedback item 2)
# ---------------------------------------------------------------------------

def _good_llm_payload(**overrides):
    base = {
        "canary": CANARY_TOKEN,
        "verdict": "ACCEPT",
        "rigor": 75,
        "novelty": 70,
        "reproducibility": 80,
        "reason": "Solid methodology.",
        "reviewer_alignment": {"0xrev1": True},
    }
    base.update(overrides)
    return base


def test_validate_llm_output_happy_path():
    ok, reason = _validate_llm_output(_good_llm_payload(), pass_thresh=60)
    assert ok is True
    assert reason == "ok"


def test_validate_llm_output_missing_canary_rejects():
    payload = _good_llm_payload()
    del payload["canary"]
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "canary" in reason


def test_validate_llm_output_wrong_canary_rejects():
    payload = _good_llm_payload(canary="wrong-token")
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "canary" in reason


def test_validate_llm_output_verdict_inconsistent_with_scores_rejects():
    # Scores avg = 30 but verdict says ACCEPT. A leader that returns this
    # would slash aligned reviewers as if the paper passed.
    payload = _good_llm_payload(verdict="ACCEPT", rigor=30, novelty=30, reproducibility=30)
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "inconsistent" in reason


def test_validate_llm_output_reject_verdict_with_high_scores_rejects():
    # Symmetric case — REJECT verdict with high scores.
    payload = _good_llm_payload(verdict="REJECT", rigor=90, novelty=90, reproducibility=90)
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "inconsistent" in reason


def test_validate_llm_output_invalid_verdict_token_rejects():
    payload = _good_llm_payload(verdict="MAYBE")
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "verdict token" in reason


def test_validate_llm_output_alignment_not_dict_rejects():
    payload = _good_llm_payload(reviewer_alignment=["0xrev1"])
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False
    assert "alignment" in reason


def test_validate_llm_output_non_dict_input_rejects():
    ok, reason = _validate_llm_output("not a dict", pass_thresh=60)
    assert ok is False


def test_validate_llm_output_string_scores_rejects():
    payload = _good_llm_payload(rigor="high")
    ok, reason = _validate_llm_output(payload, pass_thresh=60)
    assert ok is False


# ---------------------------------------------------------------------------
# Reviewer settlement — only known reviewers are affected (feedback item 1+2)
# ---------------------------------------------------------------------------

def test_settle_reviewers_all_aligned():
    aligned, misaligned = _settle_reviewers(
        {"0xa": True, "0xb": True},
        r_ids=["0xa", "0xb"],
        r_ids_set={"0xa", "0xb"},
    )
    assert aligned == ["0xa", "0xb"]
    assert misaligned == []


def test_settle_reviewers_all_misaligned():
    aligned, misaligned = _settle_reviewers(
        {"0xa": False, "0xb": False},
        r_ids=["0xa", "0xb"],
        r_ids_set={"0xa", "0xb"},
    )
    assert aligned == []
    assert misaligned == ["0xa", "0xb"]


def test_settle_reviewers_missing_key_treated_as_misaligned():
    # Leader omits reviewer_b from alignment map — safest default is
    # misaligned (they don't get a payout without an explicit True).
    aligned, misaligned = _settle_reviewers(
        {"0xa": True},
        r_ids=["0xa", "0xb"],
        r_ids_set={"0xa", "0xb"},
    )
    assert aligned == ["0xa"]
    assert misaligned == ["0xb"]


def test_settle_reviewers_ignores_unknown_ids():
    # Leader tries to slash / reward an address that never submitted.
    # Must be dropped — cannot let the leader mint payouts to arbitrary addresses.
    aligned, misaligned = _settle_reviewers(
        {"0xa": True, "0xattacker": True},
        r_ids=["0xa"],
        r_ids_set={"0xa"},
    )
    assert aligned == ["0xa"]
    assert misaligned == []
    assert "0xattacker" not in aligned + misaligned


def test_settle_reviewers_non_dict_alignment_treated_as_all_false():
    # Malformed alignment map → nobody aligned. Safest fail-closed behavior.
    aligned, misaligned = _settle_reviewers(
        "not a dict",
        r_ids=["0xa", "0xb"],
        r_ids_set={"0xa", "0xb"},
    )
    assert aligned == []
    assert misaligned == ["0xa", "0xb"]


# ---------------------------------------------------------------------------
# Full settlement math — trace flow of funds through pass / fail / FAILED
# (reviewer feedback item 4 — lifecycle tests for settlement)
# ---------------------------------------------------------------------------

class _Sim:
    """Pure Python model of PeerCoinCore's settlement + claim rules.
    Mirrors the contract's state machine so tests can trace fund flow."""
    def __init__(self, author_stake=100, reviewer_stake=20, pass_thresh=60):
        self.author_stake = author_stake
        self.reviewer_stake = reviewer_stake
        self.pass_thresh = pass_thresh
        self.papers = {}
        self.reputation = {}   # reviewer_id → int
        self.balances = {}     # address → int (payouts)
        self.contract_balance = 0
        self._next_id = 0

    def submit_paper(self, author, url, bounty_topup=0):
        pid = str(self._next_id)
        self._next_id += 1
        stake = self.author_stake
        deposit = stake + bounty_topup
        self.contract_balance += deposit
        self.papers[pid] = {
            "author": author, "url": url,
            "author_stake": stake, "bounty_pool": bounty_topup,
            "state": STATE_OPEN, "reviews": {}, "author_claimed": False,
            "ai_verdict": "", "ai_rigor": 0, "ai_novelty": 0, "ai_reproduc": 0,
        }
        return pid

    def submit_review(self, pid, reviewer, verdict, review_url):
        p = self.papers[pid]
        assert reviewer not in p["reviews"], "double-review"
        self.contract_balance += self.reviewer_stake
        p["reviews"][reviewer] = {
            "verdict": verdict, "review_url": review_url,
            "stake": self.reviewer_stake, "aligned": False, "claimed": False,
        }
        p["state"] = STATE_REVIEWING

    def finalize(self, pid, llm_payload):
        p = self.papers[pid]
        assert p["state"] in (STATE_OPEN, STATE_REVIEWING)
        ok, _reason = _validate_llm_output(llm_payload, self.pass_thresh)
        if not ok:
            p["state"] = STATE_FAILED
            return
        r = int(llm_payload["rigor"])
        n = int(llm_payload["novelty"])
        rp = int(llm_payload["reproducibility"])
        derived_verdict, avg, borderline = _derive_verdict(r, n, rp, self.pass_thresh)
        if borderline:
            p["state"] = STATE_FAILED
            p["ai_verdict"] = "BORDERLINE"
            return
        p["ai_verdict"] = derived_verdict
        p["ai_rigor"] = r
        p["ai_novelty"] = n
        p["ai_reproduc"] = rp
        author_passes = avg >= self.pass_thresh
        aligned_ids, misaligned_ids = _settle_reviewers(
            llm_payload.get("reviewer_alignment", {}),
            list(p["reviews"].keys()),
            set(p["reviews"].keys()),
        )
        aligned_set = set(aligned_ids)
        misaligned_stakes = 0
        for rid, rev in p["reviews"].items():
            rev["aligned"] = rid in aligned_set
            if not rev["aligned"]:
                misaligned_stakes += rev["stake"]
        pool = p["bounty_pool"] + misaligned_stakes
        if not author_passes:
            pool += p["author_stake"]
            p["author_stake"] = 0
        p["bounty_pool"] = pool
        # reputation bumps
        for rid, rev in p["reviews"].items():
            self.reputation[rid] = self.reputation.get(rid, 0) + (5 if rev["aligned"] else -3)
        p["state"] = STATE_FINALIZED

    def claim(self, pid, caller):
        p = self.papers[pid]
        if p["state"] == STATE_FAILED:
            if caller == p["author"] and not p["author_claimed"]:
                p["author_claimed"] = True
                self._pay(caller, p["author_stake"])
                return "author refund"
            if caller in p["reviews"]:
                rev = p["reviews"][caller]
                assert not rev["claimed"], "double claim"
                rev["claimed"] = True
                self._pay(caller, rev["stake"])
                return "reviewer refund"
            raise AssertionError("nothing to claim on failed paper")
        assert p["state"] == STATE_FINALIZED
        avg = (p["ai_rigor"] + p["ai_novelty"] + p["ai_reproduc"]) // 3
        author_passed = avg >= self.pass_thresh
        if caller == p["author"]:
            assert not p["author_claimed"], "author already claimed"
            assert author_passed, "author failed threshold, stake forfeited"
            p["author_claimed"] = True
            self._pay(caller, p["author_stake"])
            return "author payout"
        assert caller in p["reviews"], "not a reviewer"
        rev = p["reviews"][caller]
        assert not rev["claimed"], "reviewer already claimed"
        assert rev["aligned"], "reviewer not aligned, cannot claim"
        aligned_count = sum(1 for r in p["reviews"].values() if r["aligned"])
        reward = p["bounty_pool"] // aligned_count
        payout = rev["stake"] + reward
        rev["claimed"] = True
        self._pay(caller, payout)
        return f"reviewer payout {payout}"

    def _pay(self, to, amount):
        self.balances[to] = self.balances.get(to, 0) + amount
        self.contract_balance -= amount


def _payload(verdict, rigor, novelty, repro, alignment):
    return {
        "canary": CANARY_TOKEN,
        "verdict": verdict,
        "rigor": rigor, "novelty": novelty, "reproducibility": repro,
        "reason": "test",
        "reviewer_alignment": alignment,
    }


# ---------------------------------------------------------------------------
# Happy path: paper passes, mix of aligned + misaligned reviewers
# ---------------------------------------------------------------------------

def test_happy_path_pass_with_mixed_reviewers():
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv.org/abs/1", bounty_topup=10)
    sim.submit_review(pid, "revA", "ACCEPT", "https://gist/a")
    sim.submit_review(pid, "revB", "ACCEPT", "https://gist/b")
    sim.submit_review(pid, "revC", "REJECT", "https://gist/c")

    # AI: avg 72 → ACCEPT. revA + revB aligned (same side), revC misaligned.
    sim.finalize(pid, _payload("ACCEPT", 70, 75, 70,
                               {"revA": True, "revB": True, "revC": False}))

    p = sim.papers[pid]
    assert p["state"] == STATE_FINALIZED
    assert p["ai_verdict"] == "ACCEPT"
    # Bounty pool = 10 topup + 20 misaligned = 30. Split by 2 aligned = 15 each.
    assert p["bounty_pool"] == 30

    # Author claims 100 back.
    assert sim.claim(pid, "author") == "author payout"
    assert sim.balances["author"] == 100

    # Aligned revA: 20 stake + 15 share = 35.
    assert "35" in sim.claim(pid, "revA")
    assert sim.balances["revA"] == 35
    assert "35" in sim.claim(pid, "revB")
    assert sim.balances["revB"] == 35

    # Misaligned revC cannot claim.
    with pytest.raises(AssertionError, match="not aligned"):
        sim.claim(pid, "revC")

    # Reputation: aligned +5, misaligned -3.
    assert sim.reputation["revA"] == 5
    assert sim.reputation["revB"] == 5
    assert sim.reputation["revC"] == -3

    # Contract balance drained (100 author + 35 + 35 aligned = 170 out of 170 in).
    assert sim.contract_balance == 0


def test_fail_path_author_stake_forfeited():
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/2", bounty_topup=0)
    sim.submit_review(pid, "revA", "REJECT", "https://gist/1")
    sim.submit_review(pid, "revB", "ACCEPT", "https://gist/2")

    # AI: avg 20 → REJECT. revA aligned, revB misaligned.
    sim.finalize(pid, _payload("REJECT", 20, 20, 20,
                               {"revA": True, "revB": False}))

    p = sim.papers[pid]
    assert p["ai_verdict"] == "REJECT"
    assert p["author_stake"] == 0   # forfeited
    # Pool = 0 topup + 20 misaligned + 100 forfeit = 120. Alone aligned gets all.
    assert p["bounty_pool"] == 120

    # Author claim reverts — paper failed threshold.
    with pytest.raises(AssertionError, match="stake forfeited"):
        sim.claim(pid, "author")

    # Aligned revA: 20 stake + 120 share = 140.
    assert "140" in sim.claim(pid, "revA")
    assert sim.balances["revA"] == 140


def test_failed_state_refunds_everyone():
    # AI returned garbage / borderline / consensus failure → FAILED.
    # Author + every reviewer refunds full stake, no reputation bumps.
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/3")
    sim.submit_review(pid, "revA", "ACCEPT", "https://gist/a")
    sim.submit_review(pid, "revB", "REJECT", "https://gist/b")

    # Force FAILED: verdict inconsistent with scores → _validate_llm_output rejects.
    sim.finalize(pid, _payload("ACCEPT", 10, 10, 10, {"revA": True, "revB": False}))
    assert sim.papers[pid]["state"] == STATE_FAILED

    # No reputation change on FAILED.
    assert "revA" not in sim.reputation
    assert "revB" not in sim.reputation

    # Everyone refunds.
    assert sim.claim(pid, "author") == "author refund"
    assert sim.balances["author"] == 100
    assert sim.claim(pid, "revA") == "reviewer refund"
    assert sim.balances["revA"] == 20
    assert sim.claim(pid, "revB") == "reviewer refund"
    assert sim.balances["revB"] == 20
    assert sim.contract_balance == 0


def test_borderline_treated_as_failed_full_refund():
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/4")
    sim.submit_review(pid, "revA", "ACCEPT", "https://gist/a")
    # Scores put avg = 62, within ±BORDERLINE_MARGIN(5) of threshold 60 → FAILED.
    sim.finalize(pid, _payload("ACCEPT", 62, 62, 62, {"revA": True}))
    assert sim.papers[pid]["state"] == STATE_FAILED
    assert sim.papers[pid]["ai_verdict"] == "BORDERLINE"
    # No slashing, no reputation.
    assert "revA" not in sim.reputation
    # Everyone refunds.
    assert sim.claim(pid, "author") == "author refund"
    assert sim.claim(pid, "revA") == "reviewer refund"


def test_double_claim_reverts():
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/5", bounty_topup=10)
    sim.submit_review(pid, "revA", "ACCEPT", "https://gist/a")
    sim.finalize(pid, _payload("ACCEPT", 80, 80, 80, {"revA": True}))
    sim.claim(pid, "author")
    with pytest.raises(AssertionError, match="already claimed"):
        sim.claim(pid, "author")
    sim.claim(pid, "revA")
    with pytest.raises(AssertionError, match="already claimed"):
        sim.claim(pid, "revA")


def test_leader_cannot_slash_unknown_reviewer():
    # Malicious leader adds an unknown 0xattacker to alignment_map.
    # Contract must ignore — attacker doesn't get paid and real reviewers
    # aren't affected.
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/6")
    sim.submit_review(pid, "revA", "ACCEPT", "https://gist/a")
    sim.finalize(pid, _payload("ACCEPT", 80, 80, 80,
                               {"revA": True, "0xattacker": True}))
    assert sim.papers[pid]["state"] == STATE_FINALIZED
    # revA got aligned + bump, attacker got nothing.
    assert sim.papers[pid]["reviews"]["revA"]["aligned"] is True
    assert sim.reputation.get("0xattacker") is None
    with pytest.raises(AssertionError, match="not a reviewer"):
        sim.claim(pid, "0xattacker")


def test_verdict_inconsistent_with_scores_never_settles():
    # Leader returns "ACCEPT" but scores avg 30. _validate_llm_output rejects,
    # paper goes to FAILED, funds refund — no reviewer is slashed on a lie.
    sim = _Sim()
    pid = sim.submit_paper("author", "https://arxiv/7")
    sim.submit_review(pid, "revA", "REJECT", "https://gist/a")
    sim.submit_review(pid, "revB", "ACCEPT", "https://gist/b")
    sim.finalize(pid, _payload("ACCEPT", 30, 30, 30,
                               {"revA": False, "revB": True}))
    assert sim.papers[pid]["state"] == STATE_FAILED
    # revB is NOT slashed even though the malicious payload said they were aligned
    # on a "passing" paper. Both refund.
    sim.claim(pid, "author")
    sim.claim(pid, "revA")
    sim.claim(pid, "revB")
    assert sim.balances["author"] == 100
    assert sim.balances["revA"] == 20
    assert sim.balances["revB"] == 20


def test_alignment_map_string_ignored_no_slashing():
    # Malformed alignment (a string, not a dict). Contract must still finalize
    # cleanly if scores are consistent, but with EVERYONE misaligned.
    # Then nobody claims payout — everyone loses stake to the bounty pool that
    # nobody can drain. This is a design corner-case: leader can't do this
    # because validator_fn rejects non-dict alignment, but the settlement path
    # is tested here for defense-in-depth.
    aligned, misaligned = _settle_reviewers("bad", ["a", "b"], {"a", "b"})
    assert aligned == []
    assert misaligned == ["a", "b"]
