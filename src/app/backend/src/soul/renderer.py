"""Board Renderer - SVG to PNG conversion using cairosvg.

Renders chess.Board to PNG for vision model input.
"""

from __future__ import annotations

import io
from typing import Optional

import chess
import chess.svg
import cairosvg

from src.utils.logger import get_logger

logger = get_logger(__name__)


class BoardRenderer:
    """Renders chess boards to PNG images using cairosvg.
    
    Converts python-chess SVG output to PNG buffer for vision models.
    """
    
    def __init__(
        self,
        size: int = 400,
        flipped: bool = False,
        colors: Optional[dict] = None
    ) -> None:
        """Initialize the board renderer.
        
        Args:
            size: Output image size in pixels (square).
            flipped: Whether to render from black's perspective.
            colors: Custom square colors dict.
        """
        self.size = size
        self.flipped = flipped
        self.colors = colors or {
            "square light": "#F0D9B5",
            "square dark": "#B58863",
        }
        
        logger.debug(f"BoardRenderer initialized with size={size}")
    
    def render_svg(
        self,
        board: chess.Board,
        last_move: Optional[chess.Move] = None,
        check_square: Optional[chess.Square] = None
    ) -> str:
        """Render board to SVG string.
        
        Args:
            board: The chess position to render.
            last_move: Optional last move to highlight.
            check_square: Optional square to highlight as in check.
            
        Returns:
            SVG string representation of the board.
        """
        # Highlight last move if provided
        arrows = []
        fill = {}
        
        if last_move:
            fill[last_move.from_square] = "#AAA23B"
            fill[last_move.to_square] = "#CDD16A"
        
        if check_square is not None:
            fill[check_square] = "#FF6B6B"
        
        svg = chess.svg.board(
            board,
            size=self.size,
            flipped=self.flipped,
            fill=fill,
            arrows=arrows,
            colors=self.colors
        )
        
        return svg
    
    def render_png(
        self,
        board: chess.Board,
        last_move: Optional[chess.Move] = None
    ) -> bytes:
        """Render board to PNG bytes.
        
        Args:
            board: The chess position to render.
            last_move: Optional last move to highlight.
            
        Returns:
            PNG image as bytes.
        """
        # Check if king is in check
        check_square = None
        if board.is_check():
            check_square = board.king(board.turn)
        
        svg = self.render_svg(board, last_move, check_square)
        
        try:
            png_bytes = cairosvg.svg2png(
                bytestring=svg.encode('utf-8'),
                output_width=self.size,
                output_height=self.size
            )
            if png_bytes is None:
                raise RuntimeError("cairosvg returned None")
            return png_bytes
        except Exception as e:
            logger.error(f"Failed to convert SVG to PNG: {e}")
            raise
    
    def render_png_buffer(
        self,
        board: chess.Board,
        last_move: Optional[chess.Move] = None
    ) -> io.BytesIO:
        """Render board to PNG BytesIO buffer.
        
        Useful for passing directly to API calls.
        
        Args:
            board: The chess position to render.
            last_move: Optional last move to highlight.
            
        Returns:
            BytesIO buffer containing PNG image.
        """
        png_bytes = self.render_png(board, last_move)
        return io.BytesIO(png_bytes)
    
    def save_png(
        self,
        board: chess.Board,
        filepath: str,
        last_move: Optional[chess.Move] = None
    ) -> None:
        """Save board as PNG file.
        
        Args:
            board: The chess position to render.
            filepath: Path to save the PNG file.
            last_move: Optional last move to highlight.
        """
        png_bytes = self.render_png(board, last_move)
        
        with open(filepath, 'wb') as f:
            f.write(png_bytes)
        
        logger.info(f"Board saved to {filepath}")
