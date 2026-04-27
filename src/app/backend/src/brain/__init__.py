"""Brain Module - THE LOGIC of LiquidChess.

Provides objective chess analysis using Stockfish engine and heuristic metrics.
"""

from .engine import StockfishEngine, EngineAnalysis
from .heuristics import get_mobility_score, get_dominance_score, HeuristicMetrics

__all__ = [
    "StockfishEngine",
    "EngineAnalysis", 
    "get_mobility_score",
    "get_dominance_score",
    "HeuristicMetrics"
]
