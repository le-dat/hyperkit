"""Input guard — re-export from input.py for convenient imports."""

from guards.input import guard_input, wrap_xml, MAX_INPUT_CHARS

__all__ = ["guard_input", "wrap_xml", "MAX_INPUT_CHARS"]