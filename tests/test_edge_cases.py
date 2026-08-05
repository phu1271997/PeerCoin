import json
from contracts.peercoin_core import _extract_json, _build_jury_prompt


def test_extract_json_plain():
    data = {"verdict": "ACCEPT", "rigor": 80}
    assert _extract_json(json.dumps(data)) == data


def test_extract_json_code_fence():
    data = {"verdict": "REJECT", "rigor": 40}
    raw = f"```json\n{json.dumps(data)}\n```"
    assert _extract_json(raw) == data


def test_extract_json_text_around():
    data = {"verdict": "ACCEPT", "rigor": 90}
    raw = f"Here is the evaluation:\n{json.dumps(data)}\nHope this helps!"
    assert _extract_json(raw) == data


def test_build_jury_prompt_contains_paper_info():
    prompt = _build_jury_prompt(
        title="Quantum Peer Review",
        field="Physics",
        abstract="Novel quantum method",
        paper_text="Full text content here",
        reviews=[],
    )
    assert "Quantum Peer Review" in prompt
    assert "Physics" in prompt
    assert "Novel quantum method" in prompt
    assert "Full text content here" in prompt
