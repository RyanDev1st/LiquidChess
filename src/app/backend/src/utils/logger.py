"""Logger - Centralized logging configuration for LiquidChess.

Provides consistent logging across all modules.
"""

from __future__ import annotations

import logging
import sys
from typing import Optional


# Default log format
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Global flag to track if logging is set up
_logging_configured = False


def setup_logging(
    level: int = logging.INFO,
    log_file: Optional[str] = None,
    format_string: Optional[str] = None
) -> None:
    """Set up logging configuration for the entire application.
    
    Args:
        level: Logging level (default: INFO).
        log_file: Optional file path to write logs to.
        format_string: Optional custom format string.
    """
    global _logging_configured
    
    if _logging_configured:
        return
    
    format_str = format_string or LOG_FORMAT
    
    # Configure root logger
    handlers: list[logging.Handler] = []
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(format_str, DATE_FORMAT))
    handlers.append(console_handler)
    
    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(logging.Formatter(format_str, DATE_FORMAT))
        handlers.append(file_handler)
    
    # Configure root logger
    logging.basicConfig(
        level=level,
        handlers=handlers,
        format=format_str,
        datefmt=DATE_FORMAT
    )
    
    # Reduce noise from external libraries
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    _logging_configured = True


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a module.
    
    Ensures logging is configured before returning.
    
    Args:
        name: Logger name (typically __name__).
        
    Returns:
        Configured logger instance.
    """
    # Ensure logging is set up
    if not _logging_configured:
        setup_logging()
    
    return logging.getLogger(name)


class LogContext:
    """Context manager for temporary log level changes."""
    
    def __init__(self, logger: logging.Logger, level: int) -> None:
        self.logger = logger
        self.new_level = level
        self.old_level: Optional[int] = None
    
    def __enter__(self) -> logging.Logger:
        self.old_level = self.logger.level
        self.logger.setLevel(self.new_level)
        return self.logger
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.old_level is not None:
            self.logger.setLevel(self.old_level)
