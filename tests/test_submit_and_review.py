import pytest


def test_contract_structure_and_constants():
    from contracts.peercoin_core import (
        VERDICT_ACCEPT,
        VERDICT_WEAK_ACCEPT,
        VERDICT_WEAK_REJECT,
        VERDICT_REJECT,
        STATE_OPEN,
        STATE_REVIEWING,
        STATE_FINALIZED,
        STATE_FAILED,
    )

    assert VERDICT_ACCEPT == "ACCEPT"
    assert VERDICT_WEAK_ACCEPT == "WEAK_ACCEPT"
    assert VERDICT_WEAK_REJECT == "WEAK_REJECT"
    assert VERDICT_REJECT == "REJECT"

    assert STATE_OPEN == "OPEN"
    assert STATE_REVIEWING == "REVIEWING"
    assert STATE_FINALIZED == "FINALIZED"
    assert STATE_FAILED == "FAILED"
