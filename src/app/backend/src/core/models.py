"""Shared controller models for LiquidChess."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

import chess

from src.brain import EngineAnalysis
from src.brain.heuristics import HeuristicMetrics
from src.watcher import TurnColor


@dataclass
class GameConfig:
    """Configuration for a LiquidChess game session."""

    game_id: str
    my_color: TurnColor
    stockfish_path: Optional[str] = None
    groq_api_key: Optional[str] = None
    enable_vision: bool = False
    commentary_callback: Optional[Callable[[str], Awaitable[None]]] = None


@dataclass
class TurnContext:
    """Context for processing a single turn."""

    board: chess.Board
    last_move_san: Optional[str]
    analysis: Optional[EngineAnalysis] = None
    heuristics: Optional[HeuristicMetrics] = None
    vlm_description: Optional[str] = None
    eval_swing: float = 0.0
    prev_analysis: Optional[EngineAnalysis] = None
