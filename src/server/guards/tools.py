"""Tool guard — allowlist, loop detection, path traversal, bash command validation."""

import hashlib
import os
import re
from collections import defaultdict
from typing import Any


ALLOWED_TOOLS: set[str] = {
    "create_invoice", "search_vendor", "get_exchange_rate",
    "search_web", "list_files", "read_file", "write_file", "run_bash_command",
}

MAX_TOOL_CALLS = 15
EMPTY_RESULT_MAX = 3  # 3× empty results → stop agent


# ── 1. Path Traversal Guard ───────────────────────────────────────────


def check_path_traversal(target_path: str, allowed_base_dir: str = "/home/app/workspace") -> str:
    """
    Ensure the resolved absolute path is strictly nested within the allowed base directory.
    Uses realpath to resolve symlinks, relative segments (..), or shortcuts.
    """
    resolved_base = os.path.realpath(allowed_base_dir)
    if not os.path.isabs(target_path):
        resolved_target = os.path.realpath(os.path.join(resolved_base, target_path))
    else:
        resolved_target = os.path.realpath(target_path)

    if os.path.commonpath([resolved_target, resolved_base]) != resolved_base:
        raise ValueError(
            f"Security: path '{target_path}' resolves outside allowed directory"
        )
    return resolved_target


# ── 2. Bash Command Validator ──────────────────────────────────────────


class BashCommandValidator:
    """
    Prevent command injection and dangerous shell command execution.
    """
    BLOCK_REGEX = re.compile(
        r"\b(sudo|su|pkexec|chown|chmod|visudo|passwd|shadow)\b|"
        r"/(etc/(passwd|shadow|hosts|sysconfig|profile)|var/log|proc|sys|dev)\b|"
        r"\b(rm\s+-[rRfFi]*\s+[^;\|&]+|\bmv\s+[^;\|&]+\s+/dev/null)\b|"
        r"\beval\b|"
        r"(bash|sh|zsh|fish)\s+-[cCeEs]|\bexec\b",
        re.IGNORECASE,
    )

    @classmethod
    def validate(cls, command: str) -> None:
        cleaned = " ".join(command.split())
        if cls.BLOCK_REGEX.search(cleaned):
            raise ValueError(f"Security: blocked dangerous bash command: '{cleaned}'")


# ── 3. Tool Guard Class ───────────────────────────────────────────────


class ToolGuard:
    """Track tool call counts, detect loops, enforce allowlist."""

    def __init__(self):
        self._counts: dict[str, int] = defaultdict(int)
        self._sigs: dict[str, set[str]] = defaultdict(set)
        self._empty: dict[str, int] = defaultdict(int)

    def check(self, session_id: str, tool: str, args: dict[str, Any]) -> None:
        if tool not in ALLOWED_TOOLS:
            raise ValueError(f"Tool '{tool}' not in allowlist")

        self._counts[session_id] += 1
        if self._counts[session_id] > MAX_TOOL_CALLS:
            raise ValueError(f"Max tool calls ({MAX_TOOL_CALLS}) exceeded — runaway agent")

        sig = hashlib.md5(f"{tool}:{sorted(args.items())}".encode()).hexdigest()
        if sig in self._sigs[session_id]:
            raise ValueError(f"Duplicate call: {tool}({args}) — agent stuck in loop")
        self._sigs[session_id].add(sig)

        # Apply per-tool security checks
        if tool in {"read_file", "write_file", "list_files"}:
            if "path" in args:
                check_path_traversal(args["path"])

        if tool == "run_bash_command":
            if "command" in args:
                BashCommandValidator.validate(args["command"])

    def record_empty(self, session_id: str) -> bool:
        """Return True if agent should stop due to too many empty results."""
        self._empty[session_id] += 1
        return self._empty[session_id] >= EMPTY_RESULT_MAX

    def reset(self, session_id: str) -> None:
        for d in (self._counts, self._sigs, self._empty):
            d.pop(session_id, None)


tool_guard = ToolGuard()