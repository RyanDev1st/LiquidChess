"""Shared constants for the Discord bot runtime."""

from __future__ import annotations

import discord

LUCIAN_RED = 0x880000
DEFAULT_PREFIX = "!"

COG_EXTENSIONS = [
    "src.discord.cogs.arena",
    "src.discord.cogs.guild",
    "src.discord.cogs.jester",
    "src.discord.cogs.utility",
    "src.discord.cogs.match",
    "src.discord.cogs.progression",
    "src.discord.cogs.fate",
    "src.discord.cogs.gatekeeper",
]


def build_default_intents() -> discord.Intents:
    """Build the Discord intents used by the bot."""
    intents = discord.Intents.default()
    intents.message_content = True
    intents.guilds = True
    intents.voice_states = True
    intents.members = True
    intents.dm_messages = True
    return intents
