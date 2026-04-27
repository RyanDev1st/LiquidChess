"""Board Eye - Vision model integration for visual board description.

Uses Groq's Llama 3.2 11B Vision model for visual texture analysis.
Only triggered when trigger_vision=True to optimize costs.
"""

from __future__ import annotations

import base64
from typing import Optional

import chess
from groq import AsyncGroq

from src.soul.renderer import BoardRenderer
from src.utils.logger import get_logger

logger = get_logger(__name__)


# Vision model configuration
VISION_MODEL = "llama-3.2-11b-vision-preview"
VISION_SYSTEM_PROMPT = """You are a chess position analyzer. Describe the visual texture of this chess position in one short, evocative sentence. Focus on:
- Piece clustering and tension
- Pawn structure aesthetics
- King safety appearance
- Overall board harmony or chaos

Be poetic but brief. Maximum 20 words."""


class BoardEye:
    """Vision analysis of chess positions using Groq's Vision endpoint.
    
    Uses Llama 3.2 11B Vision to provide visual texture descriptions.
    This is expensive - only trigger when trigger_vision=True.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = VISION_MODEL
    ) -> None:
        """Initialize the BoardEye.
        
        Args:
            api_key: Groq API key. Uses GROQ_API_KEY env var if None.
            model: Vision model to use.
        """
        self._client = AsyncGroq(api_key=api_key)
        self._model = model
        self._renderer = BoardRenderer(size=512)  # Higher res for vision
        
        logger.info(f"BoardEye initialized with model: {model}")
    
    async def describe_position(
        self,
        board: chess.Board,
        last_move: Optional[chess.Move] = None,
        trigger_vision: bool = False
    ) -> Optional[str]:
        """Get a visual description of the board position.
        
        CONSTRAINT: Only makes API call if trigger_vision=True.
        
        Args:
            board: The chess position to describe.
            last_move: Optional last move for context.
            trigger_vision: Whether to actually call the vision API.
            
        Returns:
            Visual description string, or None if trigger_vision=False.
        """
        if not trigger_vision:
            logger.debug("Vision not triggered, skipping API call")
            return None
        
        try:
            # Render board to PNG
            png_bytes = self._renderer.render_png(board, last_move)
            
            # Encode as base64
            base64_image = base64.b64encode(png_bytes).decode('utf-8')
            
            # Call vision API
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": VISION_SYSTEM_PROMPT
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            description = content.strip() if content else ""
            logger.debug(f"Vision description: {description}")
            
            return description
            
        except Exception as e:
            logger.error(f"Vision API call failed: {e}")
            return None
    
    async def close(self) -> None:
        """Close the Groq client."""
        await self._client.close()
