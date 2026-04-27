"""TCN Decoder - Wrapper for chess-tcn library.

Handles the critical parsing of Chess.com's proprietary TCN (Tournament Chess Notation)
move encoding format into standard chess moves.
"""

from __future__ import annotations

import chess
import chess_tcn
from typing import Optional

from src.utils.logger import get_logger

logger = get_logger(__name__)


class TCNDecodeError(Exception):
    """Raised when TCN decoding fails."""
    pass


class TCNDecoder:
    """Wrapper for chess-tcn library with robust error handling.
    
    The Glass Jaw Defense: All parsing is wrapped in try/except to handle
    API schema changes gracefully.
    """
    
    @staticmethod
    def _move_dict_to_uci(move_dict: dict) -> str:
        """Convert a chess-tcn move dict to UCI string.
        
        Args:
            move_dict: Dict with 'from', 'to', and optionally 'promotion' keys.
            
        Returns:
            UCI move string (e.g., 'e2e4', 'e7e8q').
        """
        uci = move_dict['from'] + move_dict['to']
        if 'promotion' in move_dict and move_dict['promotion']:
            uci += move_dict['promotion'].lower()
        return uci
    
    @staticmethod
    def decode_to_board(tcn_string: str) -> chess.Board:
        """Decode a TCN string into a chess.Board object.
        
        Args:
            tcn_string: The TCN-encoded move list from Chess.com API.
            
        Returns:
            A chess.Board with all moves applied.
            
        Raises:
            TCNDecodeError: If the TCN string cannot be decoded.
        """
        board = chess.Board()
        
        if not tcn_string:
            return board
        
        try:
            # chess-tcn decodes TCN to a list of move dicts
            move_dicts: list[dict] = chess_tcn.decode_tcn(tcn_string)
            
            for move_dict in move_dicts:
                uci_move = TCNDecoder._move_dict_to_uci(move_dict)
                move = chess.Move.from_uci(uci_move)
                if move in board.legal_moves:
                    board.push(move)
                else:
                    logger.warning(f"Illegal move detected in TCN: {uci_move}")
                    raise TCNDecodeError(f"Illegal move in TCN sequence: {uci_move}")
                    
        except (KeyError, ValueError, AttributeError) as e:
            # Glass Jaw Defense: Catch schema changes gracefully
            logger.error(f"TCN decode failed (possible API schema change): {e}")
            raise TCNDecodeError(f"Failed to decode TCN string: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error decoding TCN: {e}")
            raise TCNDecodeError(f"Unexpected TCN decode error: {e}") from e
            
        return board
    
    @staticmethod
    def decode_to_moves(tcn_string: str) -> list[str]:
        """Decode a TCN string into a list of UCI move strings.
        
        Args:
            tcn_string: The TCN-encoded move list from Chess.com API.
            
        Returns:
            List of UCI move strings (e.g., ['e2e4', 'd7d5']).
            
        Raises:
            TCNDecodeError: If the TCN string cannot be decoded.
        """
        if not tcn_string:
            return []
            
        try:
            move_dicts = chess_tcn.decode_tcn(tcn_string)
            return [TCNDecoder._move_dict_to_uci(m) for m in move_dicts]
        except (KeyError, ValueError, AttributeError) as e:
            logger.error(f"TCN decode to moves failed: {e}")
            raise TCNDecodeError(f"Failed to decode TCN to moves: {e}") from e
    
    @staticmethod
    def get_last_move_san(board: chess.Board) -> Optional[str]:
        """Get the last move in Standard Algebraic Notation.
        
        Args:
            board: The chess board after moves have been applied.
            
        Returns:
            The last move in SAN format, or None if no moves played.
        """
        if not board.move_stack:
            return None
            
        # Pop and push to get the move in context of the previous position
        last_move = board.pop()
        san = board.san(last_move)
        board.push(last_move)
        
        return san
    
    @staticmethod
    def get_move_count(board: chess.Board) -> int:
        """Get the number of half-moves (ply) played.
        
        Args:
            board: The chess board.
            
        Returns:
            Number of half-moves played.
        """
        return len(board.move_stack)
