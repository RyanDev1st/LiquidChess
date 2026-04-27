"""Core Module - THE NERVOUS SYSTEM of LiquidChess.

Orchestrates Watcher, Brain, and Soul components.
"""

from .event_loop import LiquidChessController, GameConfig

__all__ = ["LiquidChessController", "GameConfig"]
