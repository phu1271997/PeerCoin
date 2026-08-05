import builtins
import sys
import pytest
from unittest.mock import MagicMock

if "genlayer" not in sys.modules:
    try:
        import genlayer
    except ImportError:
        mock_gl = MagicMock()

        class MockContract:
            pass

        class MockUserError(Exception):
            pass

        class MockAddress:
            def __init__(self, val="0x0"):
                self.val = val
                self.as_hex = val

            def __str__(self):
                return str(self.val)

        def mock_allow_storage(cls):
            return cls

        mock_gl.Contract = MockContract
        mock_gl.UserError = MockUserError
        mock_gl.Address = MockAddress
        mock_gl.allow_storage = mock_allow_storage
        mock_gl.bigint = lambda x: int(x)
        mock_gl.u8 = lambda x: int(x)
        mock_gl.u256 = lambda x: int(x)
        mock_gl.i256 = lambda x: int(x)
        mock_gl.TreeMap = dict
        mock_gl.DynArray = list
        mock_gl.storage = MagicMock()
        mock_gl.storage.inmem_allocate = lambda t: t() if callable(t) else []
        mock_gl.public = MagicMock()
        mock_gl.nondet = MagicMock()
        mock_gl.vm = MagicMock()
        mock_gl.vm.UserError = MockUserError
        mock_gl.block = MagicMock()
        mock_gl.message = MagicMock()
        mock_gl.get_contract_at = MagicMock()
        mock_gl.contract_interface = lambda cls: cls

        sys.modules["genlayer"] = mock_gl
        builtins.gl = mock_gl
elif not hasattr(builtins, "gl"):
    import genlayer
    if hasattr(genlayer, "gl"):
        builtins.gl = genlayer.gl
    else:
        builtins.gl = genlayer


def clear_known_contracts():
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)


@pytest.fixture(autouse=True)
def _reset_contracts():
    clear_known_contracts()
    yield
