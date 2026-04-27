"""Stockfish Engine Wrapper - Objective chess evaluation.

Wraps chess.engine.SimpleEngine with strict time limits for fast analysis.
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, List

import chess
import chess.engine

from src.utils.logger import get_logger

logger = get_logger(__name__)


# Strict time limit: 100ms per analysis
ENGINE_TIME_LIMIT = 0.1

# Thread pool for running sync engine in async context
_executor = ThreadPoolExecutor(max_workers=1)


@dataclass
class EngineAnalysis:
    """Result of Stockfish analysis."""
    
    score_cp: Optional[int]  # Score in centipawns (None if mate)
    score_mate: Optional[int]  # Mate in N moves (None if not mate)
    principal_variation: List[chess.Move]  # Best line of play
    depth: int  # Search depth reached
    
    @property
    def score_numeric(self) -> float:
        """Get a numeric score for comparison.
        
        Returns centipawns, or ±10000 for mate scores.
        """
        if self.score_mate is not None:
            return 10000 if self.score_mate > 0 else -10000
        return float(self.score_cp or 0)
    
    @property
    def is_mate(self) -> bool:
        """Check if position is mate or forced mate."""
        return self.score_mate is not None
    
    def pv_san(self, board: chess.Board) -> List[str]:
        """Get principal variation in SAN notation.
        
        Args:
            board: The board position before the PV.
            
        Returns:
            List of moves in SAN format.
        """
        san_moves = []
        temp_board = board.copy()
        
        for move in self.principal_variation:
            if move in temp_board.legal_moves:
                san_moves.append(temp_board.san(move))
                temp_board.push(move)
            else:
                break
                
        return san_moves


class StockfishEngine:
    """Wrapper for Stockfish engine with strict time limits.
    
    Uses chess.engine.SimpleEngine with 100ms time limit per analysis.
    Runs synchronous engine calls in thread pool for async compatibility.
    """
    
    def __init__(
        self,
        stockfish_path: Optional[str] = None,
        time_limit: float = ENGINE_TIME_LIMIT
    ) -> None:
        """Initialize the Stockfish engine wrapper.
        
        Args:
            stockfish_path: Path to Stockfish executable. Auto-detects if None.
            time_limit: Time limit per analysis in seconds (default: 0.1s).
        """
        self.stockfish_path = stockfish_path or self._find_stockfish()
        self.time_limit = time_limit
        self._engine: Optional[chess.engine.SimpleEngine] = None
        
        logger.info(f"StockfishEngine initialized with {time_limit}s time limit")
    
    def _find_stockfish(self) -> str:
        """Auto-detect Stockfish path.
        
        Returns:
            Path to Stockfish executable.
            
        Raises:
            FileNotFoundError: If Stockfish cannot be found.
        """
        import shutil
        
        # Common names for Stockfish executable
        candidates = ["stockfish", "stockfish.exe", "stockfish-windows-x86-64-avx2.exe"]
        
        for name in candidates:
            path = shutil.which(name)
            if path:
                logger.info(f"Found Stockfish at: {path}")
                return path
        
        # Check common installation paths
        common_paths = [
            Path("C:/Program Files/Stockfish/stockfish.exe"),
            Path("C:/stockfish/stockfish.exe"),
            Path("/usr/games/stockfish"),
            Path("/usr/local/bin/stockfish"),
        ]
        
        for path in common_paths:
            if path.exists():
                logger.info(f"Found Stockfish at: {path}")
                return str(path)
        
        raise FileNotFoundError(
            "Stockfish not found. Please install Stockfish and add it to PATH, "
            "or provide the path explicitly."
        )
    
    async def start(self) -> None:
        """Start the Stockfish engine process."""
        if self._engine is not None:
            return
        
        try:
            loop = asyncio.get_event_loop()
            self._engine = await loop.run_in_executor(
                _executor,
                chess.engine.SimpleEngine.popen_uci,
                self.stockfish_path
            )
            logger.info("Stockfish engine started")
        except Exception as e:
            logger.error(f"Failed to start Stockfish: {e}")
            raise
    
    async def stop(self) -> None:
        """Stop the Stockfish engine gracefully."""
        if self._engine is not None:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(_executor, self._engine.quit)
            self._engine = None
            logger.info("Stockfish engine stopped")
    
    async def __aenter__(self) -> "StockfishEngine":
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.stop()
    
    async def analyze(self, board: chess.Board) -> EngineAnalysis:
        """Analyze a position with strict time limit.
        
        Args:
            board: The chess position to analyze.
            
        Returns:
            EngineAnalysis with score and principal variation.
            
        Raises:
            RuntimeError: If engine is not started.
        """
        if self._engine is None:
            raise RuntimeError("Engine not started. Call start() first or use async context manager.")
        
        try:
            # Run analysis in thread pool (SimpleEngine is synchronous)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                _executor,
                lambda: self._engine.analyse(  # type: ignore
                    board,
                    chess.engine.Limit(time=self.time_limit)
                )
            )
            
            # Extract score
            score = result.get("score")
            score_cp: Optional[int] = None
            score_mate: Optional[int] = None
            
            if score:
                pov_score = score.white()  # Always from white's perspective
                if pov_score.is_mate():
                    score_mate = pov_score.mate()
                else:
                    score_cp = pov_score.score()
            
            # Extract principal variation
            pv = result.get("pv", [])
            depth = result.get("depth", 0)
            
            return EngineAnalysis(
                score_cp=score_cp,
                score_mate=score_mate,
                principal_variation=pv,
                depth=depth
            )
            
        except Exception as e:
            logger.error(f"Engine analysis failed: {e}")
            # Return neutral analysis on error
            return EngineAnalysis(
                score_cp=0,
                score_mate=None,
                principal_variation=[],
                depth=0
            )
    
    async def get_best_move(self, board: chess.Board) -> Optional[chess.Move]:
        """Get the best move for a position.
        
        Args:
            board: The chess position.
            
        Returns:
            The best move, or None if no legal moves.
        """
        if self._engine is None:
            raise RuntimeError("Engine not started.")
        
        if board.is_game_over():
            return None
        
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                _executor,
                lambda: self._engine.play(  # type: ignore
                    board,
                    chess.engine.Limit(time=self.time_limit)
                )
            )
            return result.move
        except Exception as e:
            logger.error(f"Failed to get best move: {e}")
            return None
    
    def calculate_eval_swing(
        self,
        prev_analysis: EngineAnalysis,
        curr_analysis: EngineAnalysis
    ) -> float:
        """Calculate the evaluation swing between two positions.
        
        Used to detect blunders (swing > 200cp) or brilliancies.
        
        Args:
            prev_analysis: Analysis before the move.
            curr_analysis: Analysis after the move.
            
        Returns:
            Evaluation swing in centipawns (positive = position got worse for mover).
        """
        prev_score = prev_analysis.score_numeric
        curr_score = curr_analysis.score_numeric
        
        # Flip perspective: a negative swing means the mover blundered
        return abs(curr_score - prev_score)
