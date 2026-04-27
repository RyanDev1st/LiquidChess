"""CLI runtime entry points for LiquidChess."""

from __future__ import annotations

import asyncio
import logging
import sys
from collections.abc import Callable

from src.core import GameConfig, LiquidChessController
from src.utils.logger import get_logger, setup_logging
from src.watcher import TurnColor

from .args import parse_args
from .banner import print_banner
from .config import load_config, load_runtime_environment, resolve_groq_key


def _load_tracing_hooks() -> tuple[Callable[..., object | None], Callable[[], None]] | None:
    """Import tracing helpers only when tracing is explicitly requested."""
    try:
        from src.utils.tracing import setup_tracing, shutdown_tracing
    except Exception as exc:
        logging.warning("Tracing unavailable: %s", exc)
        return None

    return setup_tracing, shutdown_tracing


async def main() -> int:
    """Run the CLI entry point."""
    load_runtime_environment()
    args = parse_args()
    config_data = load_config(args.config)

    log_level = "DEBUG" if args.verbose else config_data.get("logging", {}).get("level", "INFO")
    setup_logging(level=getattr(logging, log_level.upper()))
    logger = get_logger(__name__)
    shutdown_tracing_hook: Callable[[], None] | None = None

    if args.enable_tracing:
        tracing_hooks = _load_tracing_hooks()
        if tracing_hooks is not None:
            setup_tracing, shutdown_tracing_hook = tracing_hooks
            if setup_tracing(service_name="liquidchess", enable=True) is not None:
                logger.info("Tracing enabled - view traces in AI Toolkit")
            else:
                logger.warning("Tracing requested but could not be enabled")

    print_banner()

    groq_key = resolve_groq_key(args.groq_key, config_data)
    if not groq_key:
        logger.error("Groq API key not provided. Set GROQ_API_KEY environment variable or use --groq-key")
        return 1

    game_config = GameConfig(
        game_id=args.game_id,
        my_color=TurnColor.WHITE if args.color == "white" else TurnColor.BLACK,
        stockfish_path=args.stockfish or config_data.get("stockfish", {}).get("path"),
        groq_api_key=groq_key,
        enable_vision=args.vision or config_data.get("vision", {}).get("enabled", False),
    )

    logger.info("Starting LiquidChess for game %s", args.game_id)
    logger.info("Playing as: %s", args.color)
    logger.info("Vision enabled: %s", game_config.enable_vision)

    controller = LiquidChessController(game_config)
    try:
        await controller.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        await controller.stop()
    except Exception as exc:
        logger.error("Fatal error: %s", exc)
        return 1
    finally:
        if shutdown_tracing_hook is not None:
            shutdown_tracing_hook()

    logger.info("LiquidChess session ended")
    return 0


def run() -> None:
    """Run the CLI synchronously."""
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\n🧛 Count Lucian departs... for now.")
        sys.exit(0)
