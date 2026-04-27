"""Turn processing helpers for the LiquidChess controller."""

from __future__ import annotations

import asyncio

from opentelemetry import trace

from src.brain import EngineAnalysis
from src.brain.heuristics import HeuristicMetrics, get_all_heuristics
from src.utils.logger import get_logger
from src.watcher import GameState

from .models import TurnContext

logger = get_logger(__name__)


async def process_turn(controller, game_state: GameState, trigger_vision: bool = False) -> TurnContext:
    """Process a turn with concurrent engine, heuristics, and vision analysis."""
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("process_turn") as span:
        span.set_attribute("move.san", game_state.last_move_san or "")
        span.set_attribute("move.count", game_state.move_count)
        span.set_attribute("vision.enabled", trigger_vision)

        context = TurnContext(
            board=game_state.board,
            last_move_san=game_state.last_move_san,
            prev_analysis=controller._last_analysis,
        )

        async def run_engine() -> EngineAnalysis:
            if controller._engine is None:
                return EngineAnalysis(score_cp=0, score_mate=None, principal_variation=[], depth=0)
            return await controller._engine.analyze(game_state.board)

        async def run_heuristics() -> HeuristicMetrics:
            return get_all_heuristics(game_state.board)

        async def run_vision() -> str | None:
            if controller._board_eye and trigger_vision:
                last_move = game_state.board.move_stack[-1] if game_state.board.move_stack else None
                return await controller._board_eye.describe_position(
                    game_state.board,
                    last_move,
                    trigger_vision=True,
                )
            return None

        results = await asyncio.gather(run_engine(), run_heuristics(), run_vision(), return_exceptions=True)

        if isinstance(results[0], BaseException):
            logger.error("Engine analysis failed: %s", results[0])
            context.analysis = EngineAnalysis(score_cp=0, score_mate=None, principal_variation=[], depth=0)
        else:
            context.analysis = results[0]

        if isinstance(results[1], BaseException):
            logger.error("Heuristics calculation failed: %s", results[1])
            context.heuristics = HeuristicMetrics(
                mobility_score=20,
                dominance_score=0,
                tension_index=0,
                is_in_check=False,
            )
        else:
            context.heuristics = results[1]

        if isinstance(results[2], BaseException):
            logger.error("Vision analysis failed: %s", results[2])
            context.vlm_description = None
        else:
            context.vlm_description = results[2]

        if context.prev_analysis and context.analysis and controller._engine:
            context.eval_swing = controller._engine.calculate_eval_swing(
                context.prev_analysis,
                context.analysis,
            )

        controller._last_analysis = context.analysis
        if context.analysis:
            span.set_attribute("analysis.score_cp", context.analysis.score_cp or 0)
            span.set_attribute("analysis.depth", context.analysis.depth)
        if context.heuristics:
            span.set_attribute("heuristics.mobility", context.heuristics.mobility_score)
            span.set_attribute("heuristics.tension", context.heuristics.tension_index)

        return context


async def generate_commentary(controller, context: TurnContext) -> str:
    """Generate commentary for a processed turn."""
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("generate_commentary") as span:
        if not context.last_move_san:
            return "...The game has yet to begin. I wait."
        if controller._speaker is None:
            return "...The voice is silent."
        if context.analysis is None or context.heuristics is None:
            return "...The senses fail me."

        span.set_attribute("move.san", context.last_move_san)
        span.set_attribute("eval.swing", context.eval_swing)
        commentary = await controller._speaker.generate_commentary(
            board=context.board,
            last_move_san=context.last_move_san,
            analysis=context.analysis,
            heuristics=context.heuristics,
            vlm_description=context.vlm_description,
            eval_swing=context.eval_swing,
        )
        span.set_attribute("commentary.length", len(commentary))
        return commentary
