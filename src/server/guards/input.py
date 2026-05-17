"""Input guard — sanitize user messages before they reach the LLM."""

import os
import re

# Configurable max input length (default 10000 chars)
def _parse_max_input():
    val = os.getenv("MAX_INPUT_CHARS", "10000")
    try:
        return int(val)
    except (ValueError, TypeError):
        return 10000

MAX_INPUT_CHARS = _parse_max_input()

# Prompt injection patterns to block
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(previous|above|all)\s+(instructions?|context)", re.IGNORECASE),
    re.compile(r"(disregard|forget)\s+(everything|all|previous)", re.IGNORECASE),
    re.compile(r"<\|(?:system|user|assistant|model)\|>", re.IGNORECASE),
    re.compile(r"{{.*?}}"),  # Handlebars templates trying to override
]


def guard_input(message: str, user_id: str) -> str:
    """
    Sanitize user input before it goes to the LLM.

    Returns the sanitized message, or raises ValueError if the input
    fails policy checks.
    """
    if not message:
        raise ValueError("Message cannot be empty")

    if len(message) > MAX_INPUT_CHARS:
        raise ValueError(f"Message exceeds maximum length of {MAX_INPUT_CHARS} characters")

    sanitized = message.strip()

    if not sanitized:
        raise ValueError("Message cannot be empty after trimming")

    # Check for null bytes
    if "\x00" in sanitized:
        raise ValueError("Message contains disallowed null bytes")

    # Check for prompt injection attempts
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(sanitized):
            raise ValueError("Message contains disallowed content pattern")

    return sanitized