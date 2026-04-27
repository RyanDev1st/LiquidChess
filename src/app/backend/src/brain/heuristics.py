"""Heuristics Module - 'Vibe' calculations for persona grounding.

Lightweight bitboard-based calculations that run in <10ms.
Provides mobility and central dominance metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import chess

from src.utils.logger import get_logger

logger = get_logger(__name__)


# Central squares for dominance calculation (the "killing floor")
CENTER_SQUARES: List[chess.Square] = [
    chess.E4, chess.D4, chess.E5, chess.D5
]

# Extended center for additional analysis
EXTENDED_CENTER: List[chess.Square] = [
    chess.C3, chess.D3, chess.E3, chess.F3,
    chess.C4, chess.D4, chess.E4, chess.F4,
    chess.C5, chess.D5, chess.E5, chess.F5,
    chess.C6, chess.D6, chess.E6, chess.F6,
]


@dataclass
class HeuristicMetrics:
    """Collection of heuristic metrics for persona grounding."""
    
    mobility_score: int  # Number of legal moves available
    dominance_score: int  # Attackers on central squares
    tension_index: int  # Number of hanging pieces
    is_in_check: bool
    
    @property
    def is_suffocating(self) -> bool:
        """Check if position is suffocating (very low mobility)."""
        return self.mobility_score < 10
    
    @property
    def tension_level(self) -> str:
        """Get human-readable tension level."""
        if self.tension_index == 0:
            return "calm"
        elif self.tension_index <= 2:
            return "tense"
        else:
            return "explosive"


def get_mobility_score(board: chess.Board) -> int:
    """Count legal moves available for the side to move.
    
    This is an extremely lightweight operation using python-chess's
    optimized legal move generator.
    
    Args:
        board: The chess position.
        
    Returns:
        Number of legal moves available.
    """
    return board.legal_moves.count()


def get_dominance_score(board: chess.Board, color: Optional[chess.Color] = None) -> int:
    """Count friendly attackers on central squares (e4/d4/e5/d5).
    
    Uses bitboard operations for speed (<10ms).
    The center is the "killing floor" in Count Lucian's parlance.
    
    Args:
        board: The chess position.
        color: Which color to count for (default: side to move).
        
    Returns:
        Number of attackers the specified color has on central squares.
    """
    if color is None:
        color = board.turn
    
    dominance = 0
    
    for square in CENTER_SQUARES:
        # Count attackers on this central square
        attackers = board.attackers(color, square)
        dominance += len(attackers)
    
    return dominance


def get_tension_index(board: chess.Board) -> int:
    """Count the number of hanging (undefended attacked) pieces.
    
    "Bleeding" pieces in Count Lucian's parlance.
    
    Args:
        board: The chess position.
        
    Returns:
        Number of hanging pieces on the board.
    """
    hanging = 0
    
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece is None:
            continue
        
        # Skip pawns for tension calculation (they're "cattle")
        if piece.piece_type == chess.PAWN:
            continue
        
        # Check if piece is attacked
        enemy_color = not piece.color
        attackers = board.attackers(enemy_color, square)
        
        if attackers:
            # Check if piece is defended
            defenders = board.attackers(piece.color, square)
            if not defenders:
                hanging += 1
            elif _is_piece_hanging_by_value(board, square, piece):
                hanging += 1
    
    return hanging


def _is_piece_hanging_by_value(
    board: chess.Board,
    square: chess.Square,
    piece: chess.Piece
) -> bool:
    """Check if a piece is hanging due to value imbalance.
    
    A piece is 'hanging' if the lowest-value attacker is worth less
    than the piece itself (e.g., pawn attacking a queen).
    
    Args:
        board: The chess position.
        square: The square the piece is on.
        piece: The piece to check.
        
    Returns:
        True if the piece is effectively hanging.
    """
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 100
    }
    
    piece_value = piece_values.get(piece.piece_type, 0)
    enemy_color = not piece.color
    
    attackers = board.attackers(enemy_color, square)
    
    if not attackers:
        return False
    
    # Find the lowest-value attacker
    min_attacker_value = 100
    for attacker_square in attackers:
        attacker = board.piece_at(attacker_square)
        if attacker:
            attacker_value = piece_values.get(attacker.piece_type, 0)
            min_attacker_value = min(min_attacker_value, attacker_value)
    
    # If lowest attacker is worth less than the piece, it's "hanging"
    return min_attacker_value < piece_value


def get_all_heuristics(board: chess.Board) -> HeuristicMetrics:
    """Calculate all heuristic metrics for a position.
    
    Designed to be lightweight and run in <10ms total.
    
    Args:
        board: The chess position.
        
    Returns:
        HeuristicMetrics with all calculated values.
    """
    return HeuristicMetrics(
        mobility_score=get_mobility_score(board),
        dominance_score=get_dominance_score(board),
        tension_index=get_tension_index(board),
        is_in_check=board.is_check()
    )


def get_piece_activity(board: chess.Board, color: Optional[chess.Color] = None) -> int:
    """Count total squares attacked by a player's pieces.
    
    A measure of overall piece activity and board control.
    
    Args:
        board: The chess position.
        color: Which color to analyze (default: side to move).
        
    Returns:
        Total number of squares attacked.
    """
    if color is None:
        color = board.turn
    
    attacked_squares = chess.SquareSet()
    
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece and piece.color == color:
            attacks = board.attacks(square)
            attacked_squares |= attacks
    
    return len(attacked_squares)
