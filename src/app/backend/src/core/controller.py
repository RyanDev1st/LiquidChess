"""Main orchestration controller for LiquidChess."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Optional

from opentelemetry import trace

from src.brain import EngineAnalysis, StockfishEngine
from src.soul import PersonaSpeaker
from src.utils.logger import get_logger
from src.watcher import GamePoller, TurnColor

from .components import cleanup_components, initialize_components
from .models import GameConfig
from .turns import generate_commentary, process_turn

if TYPE_CHECKING:
    from src.soul.vision import BoardEye

logger = get_logger(__name__)


class LiquidChessController:
    """Main controller orchestrating Watcher, Brain, and Soul."""

    def __init__(self, config: GameConfig) -> None:
        self.config = config
        self._tracer = trace.get_tracer(__name__)
        self._poller: Optional[GamePoller] = None
        self._engine: Optional[StockfishEngine] = None
        self._speaker: Optional[PersonaSpeaker] = None
        self._board_eye: Optional["BoardEye"] = None
        self._last_analysis: Optional[EngineAnalysis] = None
        self._running = False
        logger.info("LiquidChessController initialized for game %s", config.game_id)

    async def _main_loop(self) -> None:
        """Main event loop for polling and processing."""
        logger.info("Starting main event loop...")
        if self._poller is None:
            logger.error("Poller not initialized")
            return

        with self._tracer.start_as_current_span("main_loop"):
            while self._running:
                try:
                    result, next_interval = await self._poller.adaptive_poll()
                    if not result.success:
                        logger.warning("Poll failed: %s", result.error_message)
                        await asyncio.sleep(next_interval)
                        continue

                    game_state = result.game_state
                    if game_state is None:
                        await asyncio.sleep(next_interval)
                        continue
                    if game_state.game_over:
                        logger.info("Game over: %s", game_state.result)
                        self._running = False
                        break
                    if not result.tcn_changed:
                        await asyncio.sleep(next_interval)
                        continue

                    logger.info("New move detected: %s", game_state.last_move_san)
                    trigger_vision = self.config.enable_vision and game_state.move_count % 5 == 0
                    context = await process_turn(self, game_state, trigger_vision)
                    commentary = await generate_commentary(self, context)
                    print(f"\n🧛 Count Lucian: {commentary}\n")
                    if self.config.commentary_callback:
                        await self.config.commentary_callback(commentary)
                    await asyncio.sleep(next_interval)
                except asyncio.CancelledError:
                    logger.info("Main loop cancelled")
                    break
                except Exception as exc:
                    logger.error("Error in main loop (continuing): %s", exc)
                    await asyncio.sleep(1.0)

    async def run(self) -> None:
        """Run the LiquidChess controller."""
        try:
            await initialize_components(self)
            self._running = True
            await self._main_loop()
        finally:
            await cleanup_components(self)

    async def stop(self) -> None:
        """Stop the controller gracefully."""
        logger.info("Stopping LiquidChess controller...")
        self._running = False


async def run_liquid_chess(
    game_id: str,
    my_color: str = "white",
    stockfish_path: str | None = None,
    groq_api_key: str | None = None,
    enable_vision: bool = False,
) -> None:
    """Convenience function to run LiquidChess."""
    config = GameConfig(
        game_id=game_id,
        my_color=TurnColor.WHITE if my_color.lower() == "white" else TurnColor.BLACK,
        stockfish_path=stockfish_path,
        groq_api_key=groq_api_key,
        enable_vision=enable_vision,
    )
    await LiquidChessController(config).run()
