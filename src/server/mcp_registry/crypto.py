import os
import base64
import structlog
from cryptography.fernet import Fernet

logger = structlog.get_logger(__name__)

# Fallback development key (32 bytes raw string)
DEV_FALLBACK_KEY_RAW = b"antigravity-dev-fallback-32bytes"

# Read key from env — FAIL in production if not set
ENCRYPTION_KEY_B64 = os.getenv("MCP_ENCRYPTION_KEY")
if not ENCRYPTION_KEY_B64:
    if IS_PROD := os.getenv("ENV") in ("production", "prod"):
        raise RuntimeError(
            "MCP_ENCRYPTION_KEY environment variable is not set. "
            "This is required in production. Set a base64-encoded 32-byte key."
        )
    logger.warning(
        "mcp_encryption_key_missing",
        message="MCP_ENCRYPTION_KEY is not set — using development fallback key. DO NOT USE IN PRODUCTION.",
    )
    raw_key = DEV_FALLBACK_KEY_RAW
else:
    try:
        raw_key = base64.b64decode(ENCRYPTION_KEY_B64)
        if len(raw_key) != 32:
            raise ValueError(f"AES key must be exactly 32 bytes, got {len(raw_key)} bytes.")
    except Exception as e:
        raise RuntimeError(f"Invalid MCP_ENCRYPTION_KEY: {e}") from e

# Fernet requires url-safe base64 key
FERNET_KEY = base64.urlsafe_b64encode(raw_key)
fernet_cipher = Fernet(FERNET_KEY)


def encrypt_key(plain_text: str) -> str:
    """Encrypt plain text API key to base64 encoded ciphertext using Fernet (AES-128-CBC + HMAC-SHA256)."""
    if not plain_text:
        return ""
    try:
        encrypted_bytes = fernet_cipher.encrypt(plain_text.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error("mcp_encryption_failed", error=str(e))
        raise ValueError(f"Encryption failed: {e}") from e


def decrypt_key(encrypted_base64: str) -> str:
    """Decrypt base64 encoded Fernet ciphertext back to plain text API key."""
    if not encrypted_base64:
        return ""
    try:
        decrypted_bytes = fernet_cipher.decrypt(encrypted_base64.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error("mcp_decryption_failed", error=str(e))
        raise ValueError(f"Decryption failed: {e}") from e
