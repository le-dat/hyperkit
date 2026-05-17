"""Input guard — sanitize user messages before they reach the LLM."""

import re
import structlog

logger = structlog.get_logger()

# Configurable max input length (default 10000 chars)
import os
MAX_INPUT_CHARS = int(os.getenv("MAX_INPUT_CHARS", "10000"))

# Prompt injection patterns to block
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(previous|above|all)\s+(instructions?|context)", re.IGNORECASE),
    re.compile(r"(disregard|forget)\s+(everything|all|previous)", re.IGNORECASE),
    re.compile(r"<\|(?:system|user|assistant|model)\|>", re.IGNORECASE),
    re.compile(r"{{.*?}}"),  # Handlebars templates trying to override
]

# Content policy patterns
_BLOCKED_PATTERNS = [
    re.compile(r"\x00"),  # null bytes
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
            logger.warning("prompt_injection_blocked", user_id=user_id, pattern=str(pattern.pattern))
            raise ValueError("Message contains disallowed content pattern")

    return sanitized