# v0.3.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

import typing

# Tier thresholds (inclusive lower bound). Ordered ascending.
# Score is signed — a reviewer under PROBATION means their alignment history
# is net-negative and they lose review privileges until they earn back to 0.
TIER_PROBATION = "PROBATION"
TIER_NOVICE = "NOVICE"
TIER_TRUSTED = "TRUSTED"
TIER_EXPERT = "EXPERT"
TIER_LEGENDARY = "LEGENDARY"

TIER_THRESHOLDS = [
    (800, TIER_LEGENDARY),
    (300, TIER_EXPERT),
    (100, TIER_TRUSTED),
    (0, TIER_NOVICE),
]


def _derive_tier(score: int) -> str:
    """Pure function — same tier math the frontend uses."""
    if score < 0:
        return TIER_PROBATION
    for threshold, name in TIER_THRESHOLDS:
        if score >= threshold:
            return name
    return TIER_NOVICE


def _to_address(val: typing.Any) -> Address:
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        h = hex(val)
        if len(h) % 2 != 0:
            h = "0x0" + h[2:]
        return Address(h)
    return Address(str(val))


class Contract(gl.Contract):
    scores: TreeMap[str, i256]
    core: Address
    admin: Address

    def __init__(self):
        self.admin = _to_address(gl.message.sender_address)

    @gl.public.write
    def set_core(self, core_addr: Address) -> None:
        if gl.message.sender_address != self.admin:
            raise gl.vm.UserError("only admin can set core contract")
        self.core = _to_address(core_addr)

    @gl.public.write
    def bump(self, reviewer_addr: Address, delta: i256) -> None:
        if gl.message.sender_address != self.core:
            raise gl.vm.UserError("only core contract can bump reputation")
        key = str(reviewer_addr)
        cur = self.scores.get(key, i256(0))
        self.scores[key] = cur + delta

    @gl.public.view
    def score(self, reviewer_addr: Address) -> i256:
        return self.scores.get(str(reviewer_addr), i256(0))

    @gl.public.view
    def tier(self, reviewer_addr: Address) -> str:
        """Derive tier from current score. Pure view — cheap."""
        s = int(self.scores.get(str(reviewer_addr), i256(0)))
        return _derive_tier(s)

    @gl.public.view
    def profile(self, reviewer_addr: Address) -> dict:
        """One-shot query for a reviewer's score + tier + next-tier delta.
        Replaces two separate reads and gives the frontend the "N points to
        next tier" progress bar for free."""
        s = int(self.scores.get(str(reviewer_addr), i256(0)))
        tier_name = _derive_tier(s)
        next_threshold = None
        for threshold, _name in reversed(TIER_THRESHOLDS):
            if threshold > s:
                next_threshold = threshold
                break
        to_next = None if next_threshold is None else (next_threshold - s)
        return {
            "address": str(reviewer_addr),
            "score": s,
            "tier": tier_name,
            "next_tier_threshold": next_threshold if next_threshold is not None else -1,
            "points_to_next_tier": to_next if to_next is not None else -1,
        }

    @gl.public.view
    def batch_profile(self, addrs_csv: str) -> dict:
        """Comma-separated addrs -> {address: profile-dict}. Replaces N sequential
        eth_call round-trips from the Leaderboard page. Empty string returns {}.
        Truncates at 200 addresses to keep gas + response size bounded."""
        out = {}
        if not addrs_csv:
            return {"profiles": out, "count": 0}
        parts = [x.strip() for x in addrs_csv.split(",") if x.strip()]
        parts = parts[:200]
        for a in parts:
            s = int(self.scores.get(a, i256(0)))
            out[a] = {
                "score": s,
                "tier": _derive_tier(s),
            }
        return {"profiles": out, "count": len(out)}

    @gl.public.view
    def tier_stats(self) -> dict:
        """Total registered reviewers per tier. O(n) over scores map — use
        for the Governance dashboard, not per-request."""
        counts = {
            TIER_PROBATION: 0,
            TIER_NOVICE: 0,
            TIER_TRUSTED: 0,
            TIER_EXPERT: 0,
            TIER_LEGENDARY: 0,
        }
        total = 0
        for _addr, sc in self.scores.items():
            counts[_derive_tier(int(sc))] += 1
            total += 1
        return {"counts": counts, "total": total}
