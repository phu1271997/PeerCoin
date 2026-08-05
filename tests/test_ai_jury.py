import json
import pytest


def install_mocks(
    client,
    ai_verdict="ACCEPT",
    rigor=75,
    novelty=70,
    repro=65,
    reason="Methods section clear; ablation missing but non-fatal.",
    reviewer_alignment=None,
):
    reviewer_alignment = reviewer_alignment or {}
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps(
                    {
                        "verdict": ai_verdict,
                        "rigor": rigor,
                        "novelty": novelty,
                        "reproducibility": repro,
                        "reason": reason,
                        "reviewer_alignment": reviewer_alignment,
                    }
                )
            },
            "web_mocks": {".*": {"status": 200, "body": "Mock paper text content " * 100}},
        },
    )


def test_install_mocks_helper():
    class DummyProvider:
        def __init__(self):
            self.last_req = None

        def make_request(self, method, params):
            self.last_req = (method, params)

    class DummyClient:
        def __init__(self):
            self.provider = DummyProvider()

    c = DummyClient()
    install_mocks(c, reviewer_alignment={"0x123": True})
    assert c.provider.last_req[0] == "sim_installMocks"
    assert isinstance(c.provider.last_req[1], dict)
    assert "llm_mocks" in c.provider.last_req[1]
