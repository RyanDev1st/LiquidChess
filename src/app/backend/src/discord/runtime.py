"""Runtime entry points for the Discord bot."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import discord
from dotenv import load_dotenv

from src.utils.logger import get_logger, setup_logging

from .bot import LiquidChessBot

logger = get_logger(__name__)
BACKEND_ROOT = Path(__file__).resolve().parents[2]


async def run_bot() -> None:
    """Start the Discord bot."""
    load_dotenv(BACKEND_ROOT / "config" / "secrets.env")
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        logger.error(
            "DISCORD_BOT_TOKEN not found! Set it in app/backend/config/secrets.env or as environment variable."
        )
        return

    bot = LiquidChessBot()
    try:
        logger.info("Starting LiquidChess Discord bot...")
        await bot.start(token)
    except discord.LoginFailure:
        logger.error("Invalid Discord token! Check your DISCORD_BOT_TOKEN.")
    except Exception as exc:
        logger.error("Bot crashed: %s", exc)
    finally:
        if not bot.is_closed():
            await bot.close()


def main() -> None:
    """Main entry point for the Discord bot."""
    setup_logging()
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logger.info("Bot shutdown requested by user")
