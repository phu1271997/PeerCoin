# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

import json
import re
import typing
from dataclasses import dataclass

VERDICT_ACCEPT = "ACCEPT"
VERDICT_WEAK_ACCEPT = "WEAK_ACCEPT"
VERDICT_WEAK_REJECT = "WEAK_REJECT"
VERDICT_REJECT = "REJECT"

STATE_OPEN = "OPEN"
STATE_REVIEWING = "REVIEWING"
STATE_FINALIZED = "FINALIZED"
STATE_FAILED = "FAILED"


@allow_storage
@dataclass
class Review:
    reviewer: str
    verdict: str
    confidence: u8
    review_url: str
    stake: bigint
    aligned: bool
    claimed: bool


@allow_storage
@dataclass
class Paper:
    author: str
    title: str
    field: str
    url: str
    abstract: str
    author_stake: bigint
    bounty_pool: bigint
    state: str
    submitted_at: bigint
    reviewer_ids: str
    ai_verdict: str
    ai_rigor: u8
    ai_novelty: u8
    ai_reproduc: u8
    ai_reason: str
    finalized_at: bigint
    author_claimed: bool


@gl.contract_interface
class IReputation:
    def bump(self, reviewer_addr: Address, delta: i256) -> None:
        ...


def _to_address(val: typing.Any) -> Address:
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        h = hex(val)
        if len(h) % 2 != 0:
            h = "0x0" + h[2:]
        return Address(h)
    return Address(str(val))


def _addr_str(addr: typing.Any) -> str:
    try:
        if hasattr(addr, "as_hex"):
            return addr.as_hex
    except Exception:
        pass
    if isinstance(addr, int):
        h = hex(addr)
        if len(h) % 2 != 0:
            h = "0x0" + h[2:]
        return h
    return str(addr)


def _split_ids(s: str) -> typing.List[str]:
    if not s:
        return []
    return [x for x in s.split(",") if x]


def _require(cond: bool, msg: str):
    if not cond:
        raise gl.vm.UserError(msg)


def _extract_json(raw: typing.Any) -> typing.Optional[dict]:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None
    s = raw.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", s, re.DOTALL)
    if m:
        s = m.group(1)
    else:
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            s = s[start : end + 1]
    try:
        return json.loads(s)
    except Exception:
        return None


def _build_jury_prompt(*, title: str, field: str, abstract: str, paper_text: str, reviews: list) -> str:
    reviews_block = json.dumps(reviews, ensure_ascii=True, indent=2)
    return f"""You are a rigorous scientific peer reviewer serving as an on-chain AI juror.
You will read a preprint and N human reviews, then output a SINGLE JSON verdict.

## PAPER
Title: {title}
Field: {field}
Abstract: {abstract}

## FULL TEXT (first 12000 chars)
{paper_text}

## HUMAN REVIEWS
{reviews_block}

## YOUR TASK
Rate the paper on 3 axes, each 0-100:
- rigor: methodology soundness, statistical validity, threats to validity acknowledged
- novelty: genuine contribution vs. incremental, plagiarism/duplication risk
- reproducibility: code/data availability, sufficient methods detail, clear artifacts

Then output ONE verdict:
- "ACCEPT" if the average of (rigor, novelty, reproducibility) is >= 60
- "REJECT" otherwise

For each human reviewer, decide whether their `verdict` is ALIGNED with your final verdict:
- ACCEPT and WEAK_ACCEPT are considered positive
- REJECT and WEAK_REJECT are considered negative
- Reviewer aligned = (their side) matches (your side)

Output ONLY valid JSON matching this schema:
{{
  "verdict": "ACCEPT" | "REJECT",
  "rigor": <int 0..100>,
  "novelty": <int 0..100>,
  "reproducibility": <int 0..100>,
  "reason": "<2-4 sentences explaining the verdict, cite specific paper sections>",
  "reviewer_alignment": {{
    "<reviewer_id>": true | false
  }}
}}
"""


class Contract(gl.Contract):
    papers: TreeMap[str, Paper]
    reviews: TreeMap[str, TreeMap[str, Review]]
    seen_urls: TreeMap[str, bool]
    reputation: Address
    admin: Address
    next_paper_id: bigint
    author_stake_amount: bigint
    reviewer_stake_amount: bigint
    min_reviewers: u8
    max_reviewers: u8
    review_window_secs: bigint
    pass_threshold_avg: u8

    def __init__(
        self,
        reputation_addr: Address,
        author_stake: bigint,
        reviewer_stake: bigint,
        min_reviewers: u8,
        max_reviewers: u8,
        review_window_secs: bigint,
        pass_threshold_avg: u8,
    ):
        self.admin = _to_address(gl.message.sender_address)
        self.reputation = _to_address(reputation_addr)
        self.author_stake_amount = author_stake
        self.reviewer_stake_amount = reviewer_stake
        self.min_reviewers = min_reviewers
        self.max_reviewers = max_reviewers
        self.review_window_secs = review_window_secs
        self.pass_threshold_avg = pass_threshold_avg
        self.next_paper_id = bigint(0)

    @gl.public.write.payable
    def submit_paper(self, title: str, field: str, url: str, abstract: str) -> str:
        _require(gl.message.value >= self.author_stake_amount, "insufficient author stake")
        _require(len(title.strip()) > 0, "title required")
        _require(len(url.strip()) > 0, "url required")
        clean_url = url.strip()
        _require(not self.seen_urls.get(clean_url, False), "duplicate paper URL")

        bounty_topup = gl.message.value - self.author_stake_amount
        paper_id_str = str(self.next_paper_id)

        self.papers[paper_id_str] = Paper(
            author=_addr_str(gl.message.sender_address),
            title=title.strip(),
            field=field.strip(),
            url=clean_url,
            abstract=abstract.strip(),
            author_stake=self.author_stake_amount,
            bounty_pool=bounty_topup,
            state=STATE_OPEN,
            submitted_at=bigint(gl.block.timestamp),
            reviewer_ids="",
            ai_verdict="",
            ai_rigor=u8(0),
            ai_novelty=u8(0),
            ai_reproduc=u8(0),
            ai_reason="",
            finalized_at=bigint(0),
            author_claimed=False,
        )

        self.seen_urls[clean_url] = True
        self.next_paper_id = self.next_paper_id + bigint(1)
        return paper_id_str

    @gl.public.write.payable
    def sponsor_bounty(self, paper_id_str: str) -> None:
        _require(paper_id_str in self.papers, "paper not found")
        _require(gl.message.value > bigint(0), "must send value to sponsor bounty")
        paper = self.papers[paper_id_str]
        _require(paper.state != STATE_FINALIZED and paper.state != STATE_FAILED, "paper already closed")
        paper.bounty_pool = paper.bounty_pool + gl.message.value
        self.papers[paper_id_str] = paper

    @gl.public.write.payable
    def submit_review(self, paper_id_str: str, verdict: str, confidence: int, review_url: str) -> None:
        _require(paper_id_str in self.papers, "paper not found")
        paper = self.papers[paper_id_str]
        _require(paper.state in (STATE_OPEN, STATE_REVIEWING), "paper not accepting reviews")
        _require(gl.message.value == self.reviewer_stake_amount, "incorrect reviewer stake amount")
        _require(verdict in (VERDICT_ACCEPT, VERDICT_WEAK_ACCEPT, VERDICT_WEAK_REJECT, VERDICT_REJECT), "invalid verdict")
        _require(0 <= confidence <= 100, "confidence must be 0-100")
        _require(len(review_url.strip()) > 0, "review URL required")

        reviewer_id = _addr_str(gl.message.sender_address)

        if paper_id_str in self.reviews:
            _require(reviewer_id not in self.reviews[paper_id_str], "already submitted review for this paper")
        else:
            self.reviews[paper_id_str] = gl.storage.inmem_allocate(TreeMap[str, Review])

        r_ids = _split_ids(paper.reviewer_ids)
        _require(len(r_ids) < int(self.max_reviewers), "max reviewers reached")

        self.reviews[paper_id_str][reviewer_id] = Review(
            reviewer=reviewer_id,
            verdict=verdict,
            confidence=u8(confidence),
            review_url=review_url.strip(),
            stake=self.reviewer_stake_amount,
            aligned=False,
            claimed=False,
        )

        r_ids.append(reviewer_id)
        paper.reviewer_ids = ",".join(r_ids)
        if paper.state == STATE_OPEN:
            paper.state = STATE_REVIEWING
        self.papers[paper_id_str] = paper

    @gl.public.write
    def finalize(self, paper_id_str: str) -> None:
        _require(paper_id_str in self.papers, "paper not found")
        paper = self.papers[paper_id_str]
        _require(paper.state in (STATE_OPEN, STATE_REVIEWING), "paper already finalized or failed")

        now = bigint(gl.block.timestamp)
        r_ids = _split_ids(paper.reviewer_ids)
        reviewer_count = len(r_ids)
        window_over = (now - paper.submitted_at) >= self.review_window_secs
        enough_reviews = reviewer_count >= int(self.min_reviewers)
        _require(enough_reviews or window_over, "not ready to finalize")
        _require(reviewer_count > 0, "no reviews to adjudicate against")

        paper_url = paper.url
        paper_title = paper.title
        paper_field = paper.field
        paper_abstract = paper.abstract

        review_snapshot = []
        for rid in r_ids:
            r = self.reviews[paper_id_str][rid]
            review_snapshot.append({
                "reviewer_id": rid,
                "verdict": r.verdict,
                "confidence": int(r.confidence),
                "review_url": r.review_url,
            })

        def leader_fn():
            rendered = gl.nondet.web.render(paper_url)
            p_text = rendered.text if rendered else ""
            if not p_text:
                p_text = paper_abstract

            hydrated_reviews = []
            for item in review_snapshot:
                rv_url = item.get("review_url", "")
                rv_rendered = gl.nondet.web.render(rv_url) if rv_url else None
                rv_text = rv_rendered.text if rv_rendered else ""
                hydrated_reviews.append({
                    "reviewer_id": item["reviewer_id"],
                    "verdict": item["verdict"],
                    "confidence": item["confidence"],
                    "review_url": rv_url,
                    "review_text": rv_text[:3000],
                })

            prompt = _build_jury_prompt(
                title=paper_title,
                field=paper_field,
                abstract=paper_abstract,
                paper_text=p_text[:12000],
                reviews=hydrated_reviews,
            )
            resp = gl.nondet.exec_prompt(prompt)
            parsed = _extract_json(resp)
            if not parsed:
                return json.dumps({
                    "verdict": "REJECT",
                    "rigor": 0,
                    "novelty": 0,
                    "reproducibility": 0,
                    "reason": "Failed to parse validator AI jury response as JSON",
                    "reviewer_alignment": {},
                })
            return json.dumps(parsed)

        def validator_fn(leader_result: str) -> bool:
            parsed = _extract_json(leader_result)
            if not parsed:
                return False
            lead_verdict = str(parsed.get("verdict", ""))
            if lead_verdict not in ("ACCEPT", "REJECT"):
                return False
            lead_avg = (
                int(parsed.get("rigor", 0))
                + int(parsed.get("novelty", 0))
                + int(parsed.get("reproducibility", 0))
            ) // 3

            rendered = gl.nondet.web.render(paper_url)
            p_text = rendered.text if rendered else paper_abstract

            hydrated_reviews = []
            for item in review_snapshot:
                rv_url = item.get("review_url", "")
                rv_rendered = gl.nondet.web.render(rv_url) if rv_url else None
                rv_text = rv_rendered.text if rv_rendered else ""
                hydrated_reviews.append({
                    "reviewer_id": item["reviewer_id"],
                    "verdict": item["verdict"],
                    "confidence": item["confidence"],
                    "review_url": rv_url,
                    "review_text": rv_text[:3000],
                })

            prompt = _build_jury_prompt(
                title=paper_title,
                field=paper_field,
                abstract=paper_abstract,
                paper_text=p_text[:12000],
                reviews=hydrated_reviews,
            )
            v_resp = gl.nondet.exec_prompt(prompt)
            v_parsed = _extract_json(v_resp)
            if not v_parsed:
                return False

            v_verdict = str(v_parsed.get("verdict", ""))
            v_avg = (
                int(v_parsed.get("rigor", 0))
                + int(v_parsed.get("novelty", 0))
                + int(v_parsed.get("reproducibility", 0))
            ) // 3

            if lead_verdict != v_verdict:
                return False
            if abs(lead_avg - v_avg) > 15:
                return False
            return True

        res_str = gl.vm.run_nondet(leader_fn, validator_fn)
        ai = _extract_json(res_str)
        if not ai:
            paper.state = STATE_FAILED
            paper.finalized_at = bigint(gl.block.timestamp)
            self.papers[paper_id_str] = paper
            return

        rigor = int(ai.get("rigor", 0))
        novelty = int(ai.get("novelty", 0))
        repro = int(ai.get("reproducibility", 0))
        avg = (rigor + novelty + repro) // 3

        author_passes = avg >= int(self.pass_threshold_avg)

        aligned_count = 0
        misaligned_stakes = bigint(0)

        alignment_map = ai.get("reviewer_alignment", {})

        for rid in r_ids:
            r = self.reviews[paper_id_str][rid]
            is_aligned = bool(alignment_map.get(rid, False))
            r.aligned = is_aligned
            self.reviews[paper_id_str][rid] = r

            if is_aligned:
                aligned_count += 1
            else:
                misaligned_stakes = misaligned_stakes + r.stake

        pool = paper.bounty_pool + misaligned_stakes
        if not author_passes:
            pool = pool + paper.author_stake
            paper.author_stake = bigint(0)

        paper.bounty_pool = pool

        rep = gl.get_contract_at(self.reputation).as_interface(IReputation)
        for rid in r_ids:
            r = self.reviews[paper_id_str][rid]
            if r.aligned:
                rep.bump(_to_address(r.reviewer), i256(5))
            else:
                rep.bump(_to_address(r.reviewer), i256(-3))

        paper.ai_verdict = str(ai.get("verdict", "REJECT"))
        paper.ai_rigor = u8(max(0, min(100, rigor)))
        paper.ai_novelty = u8(max(0, min(100, novelty)))
        paper.ai_reproduc = u8(max(0, min(100, repro)))
        paper.ai_reason = str(ai.get("reason", ""))[:2000]
        paper.state = STATE_FINALIZED
        paper.finalized_at = bigint(gl.block.timestamp)
        self.papers[paper_id_str] = paper

    @gl.public.write
    def claim(self, paper_id_str: str) -> None:
        _require(paper_id_str in self.papers, "paper not found")
        paper = self.papers[paper_id_str]

        if paper.state == STATE_FAILED:
            if _addr_str(gl.message.sender_address) == paper.author and not paper.author_claimed:
                paper.author_claimed = True
                self.papers[paper_id_str] = paper
                gl.get_contract_at(_to_address(paper.author)).emit_transfer(value=u256(paper.author_stake))
                return

            caller_id = _addr_str(gl.message.sender_address)
            if paper_id_str in self.reviews and caller_id in self.reviews[paper_id_str]:
                r = self.reviews[paper_id_str][caller_id]
                _require(not r.claimed, "review stake already claimed")
                r.claimed = True
                self.reviews[paper_id_str][caller_id] = r
                gl.get_contract_at(gl.message.sender_address).emit_transfer(value=u256(r.stake))
                return

            raise gl.vm.UserError("nothing to claim on failed paper")

        _require(paper.state == STATE_FINALIZED, "paper not finalized")

        avg = (int(paper.ai_rigor) + int(paper.ai_novelty) + int(paper.ai_reproduc)) // 3
        author_passed = avg >= int(self.pass_threshold_avg)

        if _addr_str(gl.message.sender_address) == paper.author:
            _require(not paper.author_claimed, "author payout already claimed")
            _require(author_passed, "author failed review threshold, stake forfeited")
            paper.author_claimed = True
            self.papers[paper_id_str] = paper
            gl.get_contract_at(_to_address(paper.author)).emit_transfer(value=u256(paper.author_stake))
            return

        caller_id = _addr_str(gl.message.sender_address)
        _require(paper_id_str in self.reviews, "no reviews for this paper")
        _require(caller_id in self.reviews[paper_id_str], "caller did not review this paper")

        r = self.reviews[paper_id_str][caller_id]
        _require(not r.claimed, "reviewer reward already claimed")
        _require(r.aligned, "reviewer was not aligned with AI jury")

        r_ids = _split_ids(paper.reviewer_ids)
        aligned_count = 0
        for rid in r_ids:
            if self.reviews[paper_id_str][rid].aligned:
                aligned_count += 1

        _require(aligned_count > 0, "no aligned reviewers found")

        reward_per_aligned = paper.bounty_pool // bigint(aligned_count)
        payout = r.stake + reward_per_aligned

        r.claimed = True
        self.reviews[paper_id_str][caller_id] = r

        gl.get_contract_at(gl.message.sender_address).emit_transfer(value=u256(payout))

    @gl.public.view
    def get_paper(self, paper_id_str: str) -> dict:
        _require(paper_id_str in self.papers, "paper not found")
        p = self.papers[paper_id_str]
        rev_ids = _split_ids(p.reviewer_ids)

        return {
            "id": paper_id_str,
            "author": p.author,
            "title": p.title,
            "field": p.field,
            "url": p.url,
            "abstract": p.abstract,
            "author_stake": str(p.author_stake),
            "bounty_pool": str(p.bounty_pool),
            "state": p.state,
            "submitted_at": str(p.submitted_at),
            "reviewer_ids": rev_ids,
            "ai_verdict": p.ai_verdict,
            "ai_rigor": int(p.ai_rigor),
            "ai_novelty": int(p.ai_novelty),
            "ai_reproduc": int(p.ai_reproduc),
            "ai_reason": p.ai_reason,
            "finalized_at": str(p.finalized_at),
            "author_claimed": p.author_claimed,
        }

    @gl.public.view
    def get_review(self, paper_id_str: str, reviewer_id: str) -> dict:
        _require(paper_id_str in self.reviews, "paper reviews not found")
        _require(reviewer_id in self.reviews[paper_id_str], "review not found")
        r = self.reviews[paper_id_str][reviewer_id]
        return {
            "paper_id": paper_id_str,
            "reviewer": r.reviewer,
            "verdict": r.verdict,
            "confidence": int(r.confidence),
            "review_url": r.review_url,
            "stake": str(r.stake),
            "aligned": r.aligned,
            "claimed": r.claimed,
        }

    @gl.public.view
    def list_papers(self, offset: int = 0, limit: int = 20) -> dict:
        total = int(self.next_paper_id)
        if offset < 0:
            offset = 0
        if limit <= 0:
            limit = 20

        items = []
        end = min(total, offset + limit)
        for i in range(offset, end):
            pid = str(i)
            if pid in self.papers:
                items.append(self.get_paper(pid))

        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "items": items,
        }
