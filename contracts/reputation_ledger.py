# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

import typing


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
