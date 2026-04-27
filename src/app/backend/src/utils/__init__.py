"""Utilities Module - Shared logic for LiquidChess.

Keep this package import-safe for modules that only need logging or path helpers.
Tracing stays opt-in and is imported lazily by the CLI when requested.
"""

from .logger import get_logger, setup_logging

__all__ = ["get_logger", "setup_logging"]
