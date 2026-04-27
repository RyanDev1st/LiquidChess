"""Soul Module - THE VAMPIRE of LiquidChess.

Handles persona generation using Groq's Llama models for text and vision.
"""

from .generator import PersonaSpeaker, COUNT_LUCIAN_PROMPT

# Lazy import for vision modules (requires Cairo system library)
# These are optional and expensive - only import when needed
def get_board_eye():
    """Lazy import of BoardEye (requires Cairo)."""
    from .vision import BoardEye
    return BoardEye

def get_board_renderer():
    """Lazy import of BoardRenderer (requires Cairo)."""
    from .renderer import BoardRenderer
    return BoardRenderer

__all__ = [
    "PersonaSpeaker",
    "COUNT_LUCIAN_PROMPT",
    "get_board_eye",
    "get_board_renderer"
]
