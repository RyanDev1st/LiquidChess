"""Component lifecycle helpers for the LiquidChess controller."""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.brain import StockfishEngine
from src.soul import PersonaSpeaker, get_board_eye
from src.utils.logger import get_logger
from src.watcher import GamePoller

if TYPE_CHECKING:
    from src.core.controller import LiquidChessController

logger = get_logger(__name__)


async def initialize_components(controller: "LiquidChessController") -> None:
    """Initialize the controller's external components."""
    logger.info("Initializing components...")
    controller._poller = GamePoller(
        game_id=controller.config.game_id,
        my_color=controller.config.my_color,
    )
    controller._engine = StockfishEngine(stockfish_path=controller.config.stockfish_path)
    await controller._engine.start()
    controller._speaker = PersonaSpeaker(api_key=controller.config.groq_api_key)

    if controller.config.enable_vision:
        try:
            board_eye_class = get_board_eye()
            controller._board_eye = board_eye_class(api_key=controller.config.groq_api_key)
        except OSError as exc:
            logger.warning("Vision disabled - Cairo library not found: %s", exc)
            controller._board_eye = None

    logger.info("All components initialized")


async def cleanup_components(controller: "LiquidChessController") -> None:
    """Clean up initialized controller components."""
    logger.info("Cleaning up components...")
    if controller._poller:
        await controller._poller.close()
    if controller._engine:
        await controller._engine.stop()
    if controller._speaker:
        await controller._speaker.close()
    if controller._board_eye:
        await controller._board_eye.close()
    logger.info("All components cleaned up")
