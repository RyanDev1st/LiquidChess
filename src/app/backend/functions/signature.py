"""Discord request signature verification helpers."""

from __future__ import annotations

import logging
import os

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

logger = logging.getLogger("liquidchess")


def verify_discord_signature(raw_body: bytes, signature: str, timestamp: str) -> bool:
    """Verify Discord request signature using Ed25519."""
    public_key = os.environ.get("DISCORD_PUBLIC_KEY", "")
    if not public_key:
        logger.error("DISCORD_PUBLIC_KEY not set!")
        return False

    try:
        verify_key = VerifyKey(bytes.fromhex(public_key))
        message = f"{timestamp}{raw_body.decode('utf-8')}".encode()
        verify_key.verify(message, bytes.fromhex(signature))
        return True
    except BadSignatureError:
        logger.warning("Invalid Discord signature")
    except Exception as exc:
        logger.error("Signature verification error: %s", exc)
    return False
