"""Backward-compatible exports for the LiquidChess controller."""

from .controller import LiquidChessController, run_liquid_chess
from .models import GameConfig

__all__ = ["GameConfig", "LiquidChessController", "run_liquid_chess"]
