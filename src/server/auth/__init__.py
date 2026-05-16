# ai-server/auth/__init__.py
from .clerk import get_current_user

__all__ = ["get_current_user"]